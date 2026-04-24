// ── Repo Service ────────────────────────────────

import type { Repository } from '@chorus/shared-types';
import { RepoModel, RepoQuery } from '../../db/models/Repo.model';
import { indexRepoQueue } from '../../queue/indexRepo.queue';
import { Octokit } from '@octokit/rest';
import {
  fetchRepoLanguages,
  fetchUserLanguageProfile,
  calculateRepoDifficulty,
  type RepoDifficultyResult,
} from './repoDifficulty';
import {
  fetchCommunityHealthInputs,
  calculateCommunityHealth,
  type CommunityHealthResult,
} from './communityHealth';

// ─── Extended Analysis Result ─────────────────────────────────────────────────

export interface RepoAnalysisResult {
  repo: Repository;
  jobId: string;
  difficulty?: RepoDifficultyResult;
  communityHealth?: CommunityHealthResult;
}

export class RepoService {
  /**
   * Analyzes a repository by URL.
   * - Fetches live repo metadata from GitHub
   * - Calculates community health score (formula, no RAG)
   * - If a userId/username is provided, calculates personalized difficulty (formula, no RAG)
   * - Enqueues background indexing job for RAG pipeline
   */
  async analyzeRepo(
    repoUrl: string,
    userId?: string,
    githubUsername?: string,
  ): Promise<RepoAnalysisResult> {
    console.log(`[RepoService] Analyzing repo: ${owner}/${name}`);
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.warn('[RepoService] GITHUB_TOKEN is missing. GitHub API calls may fail or be rate-limited.');
    }

    // ── Fetch live repo metadata from GitHub ──────────────────────────────────
    let liveStars = 0;
    let liveForks = 0;
    let liveOpenIssues = 0;
    let hasTests = false;
    let hasContributingGuide = false;
    let dependencyCount = 0;

    try {
      console.log(`[RepoService] Fetching metadata for ${owner}/${name}...`);
      const octokit = new Octokit({ auth: githubToken || undefined });
      const { data: repoData } = await octokit.repos.get({ owner, repo: name });
      console.log(`[RepoService] Metadata fetched successfully for ${owner}/${name}`);

      liveStars = repoData.stargazers_count;
      liveForks = repoData.forks_count;
      liveOpenIssues = repoData.open_issues_count;

      // Check for CONTRIBUTING.md and test directories (best-effort)
      console.log(`[RepoService] Fetching file tree for ${owner}/${name}...`);
      const { data: rootTree } = await octokit.git.getTree({
        owner,
        repo: name,
        tree_sha: repoData.default_branch,
        recursive: '0',
      });
      console.log(`[RepoService] File tree fetched for ${owner}/${name}`);
      const rootPaths = rootTree.tree.map((f) => f.path?.toLowerCase() ?? '');
      hasContributingGuide = rootPaths.some((p) => p.includes('contributing'));
      hasTests = rootPaths.some((p) => p === 'tests' || p === 'test' || p === '__tests__' || p === 'spec');

      // Count dependencies from package.json size heuristic
      const pkgJson = rootTree.tree.find((f) => f.path === 'package.json');
      if (pkgJson?.size) {
        dependencyCount = Math.round((pkgJson.size ?? 0) / 30);
      }
    } catch (err) {
      console.warn('[RepoService] Could not fetch live GitHub metadata:', err);
    }

    // ── Upsert repo record in DB ──────────────────────────────────────────────
    console.log(`[RepoService] Upserting repo in DB: ${repoUrl}`);
    let repo = await RepoModel.findOne({ repoUrl });
    if (!repo) {
      repo = await RepoModel.create({
        repoUrl,
        owner,
        name,
        defaultBranch: 'main',
        stars: liveStars,
        forks: liveForks,
        openIssues: liveOpenIssues,
      });
    } else {
      // Keep stars/forks/issues fresh
      repo.stars = liveStars;
      repo.forks = liveForks;
      repo.openIssues = liveOpenIssues;
      await repo.save();
    }
    console.log(`[RepoService] Repo upserted: ${repo.id}`);

    // ── Enqueue background RAG indexing job ───────────────────────────────────
    console.log(`[RepoService] Enqueuing indexing job for ${repo.id}...`);
    const job = await indexRepoQueue.add('index-repo', {
      repoId: repo.id,
      repoUrl,
      branch: repo.defaultBranch,
      userId: userId ?? '',
    });
    console.log(`[RepoService] Job enqueued: ${job.id}`);

    const repoObj = repo.toObject() as unknown as Repository;
    const repoId = `${owner}/${name}`;

    // ── Community Health (always calculated — no user needed) ─────────────────
    let communityHealth: CommunityHealthResult | undefined;
    try {
      console.log(`[RepoService] Calculating community health for ${repoId}...`);
      const healthInputs = await fetchCommunityHealthInputs(owner, name, githubToken);
      communityHealth = calculateCommunityHealth(healthInputs);
      console.log(`[RepoService] Community health for ${repoId}: ${communityHealth.score}% (${communityHealth.label})`);
    } catch (err) {
      console.warn('[RepoService] Community health calculation failed:', err);
    }

    // ── Personalized Difficulty (only when a GitHub username is available) ────
    let difficulty: RepoDifficultyResult | undefined;
    if (githubUsername) {
      try {
        console.log(`[RepoService] Calculating difficulty for ${repoId} (user: ${githubUsername})...`);
        const [repoLanguages, userProfile] = await Promise.all([
          fetchRepoLanguages(owner, name, githubToken),
          fetchUserLanguageProfile(githubUsername, githubToken),
        ]);

        difficulty = calculateRepoDifficulty(userProfile, repoLanguages, {
          fileCount: 0,
          dependencyCount,
          hasContributingGuide,
          hasTests,
        });

        console.log(
          `[RepoService] Difficulty for ${repoId} (user: ${githubUsername}): ` +
          `${difficulty.rampScore}/5 — ${difficulty.rampLabel}`,
        );
      } catch (err) {
        console.warn('[RepoService] Difficulty calculation failed:', err);
      }
    }

    return { repo: repoObj, jobId: job.id!, difficulty, communityHealth };
  }

  /**
   * Gets a repository by ID.
   */
  async getRepoById(repoId: string): Promise<Repository | null> {
    const repo = await RepoModel.findById(repoId);
    return repo ? (repo.toObject() as unknown as Repository) : null;
  }

  /**
   * Lists all analyzed repositories.
   */
  async listRepos(limit = 20, offset = 0): Promise<Repository[]> {
    const repos = await RepoQuery.find().sort({ updatedAt: -1 }).skip(offset).limit(limit);
    return repos.map((r) => r.toObject() as unknown as Repository);
  }
}