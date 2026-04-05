// ── Repo Controller ──────────────────────────────

import type { Request, Response } from 'express';
import { RepoService } from './repo.service';
import { analyzeRepoSchema } from './repo.validator';
import { logger } from '../../observability/logger';
import { calculateIssueDifficulty } from './issueDifficulty';
import { fetchUserLanguageProfile } from './repoDifficulty';

const repoService = new RepoService();

export class RepoController {
  /**
   * POST /api/repo/analyze
   * Body: { url, branch?, githubUsername? }
   *
   * Now returns difficulty + communityHealth alongside the repo and jobId.
   * githubUsername is used to personalize the difficulty score.
   */
  async analyze(req: Request, res: Response) {
    try {
      const parsed = analyzeRepoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const githubUsername = req.body.githubUsername as string | undefined;

      const result = await repoService.analyzeRepo(
        parsed.data.url,
        req.body.userId,
        githubUsername,
      );

      return res.status(202).json(result);
    } catch (err) {
      logger.error({ err }, 'Failed to analyze repo');
      return res.status(500).json({ error: 'Failed to analyze repository' });
    }
  }

  /**
   * GET /api/repo/:id
   */
  async getById(req: Request, res: Response) {
    try {
      const repo = await repoService.getRepoById(req.params.id);
      if (!repo) return res.status(404).json({ error: 'Repository not found' });
      return res.json(repo);
    } catch (err) {
      logger.error({ err }, 'Failed to get repo');
      return res.status(500).json({ error: 'Failed to retrieve repository' });
    }
  }

  /**
   * GET /api/repo/
   */
  async list(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const repos = await repoService.listRepos(limit, offset);
      return res.json(repos);
    } catch (err) {
      logger.error({ err }, 'Failed to list repos');
      return res.status(500).json({ error: 'Failed to list repositories' });
    }
  }

  /**
   * GET /api/repo/:repoId/issues/:issueNumber/difficulty?githubUsername=xxx
   *
   * Returns personalized difficulty score for a specific issue.
   * Uses RAG to find relevant files, then formula to score difficulty.
   *
   * Query params:
   *   githubUsername  — GitHub username to personalize the score against
   *
   * Response:
   *   {
   *     score: 1–5,
   *     label: "Beginner Friendly" | ... | "Expert Level",
   *     components: { structuralComplexity, languageFamiliarity, combined },
   *     relevantFiles: [{ filePath, startLine, endLine, symbolName }],
   *     explanation: string
   *   }
   */
  async getIssueDifficulty(req: Request, res: Response) {
    try {
      const { repoId, issueNumber } = req.params;
      const githubUsername = req.query.githubUsername as string | undefined;

      // repoId format: "owner/repo" (URL-encoded as "owner%2Frepo" or with dash separator)
      // We accept "owner/repo" decoded from the URL param
      if (!repoId || !repoId.includes('/')) {
        return res.status(400).json({
          error: 'repoId must be in "owner/repo" format (URL-encode the slash as %2F)',
        });
      }

      const issueNum = parseInt(issueNumber, 10);
      if (isNaN(issueNum) || issueNum <= 0) {
        return res.status(400).json({ error: 'issueNumber must be a positive integer' });
      }

      const [owner, repo] = repoId.split('/');

      // Fetch user language profile — required for personalization
      // If no username provided, use an empty profile (results in neutral language score)
      const userProfile = githubUsername
        ? await fetchUserLanguageProfile(githubUsername, process.env.GITHUB_TOKEN)
        : {};

      const result = await calculateIssueDifficulty(
        owner,
        repo,
        repoId,
        issueNum,
        userProfile,
        process.env.GITHUB_TOKEN,
      );

      return res.json(result);
    } catch (err) {
      logger.error({ err }, 'Failed to calculate issue difficulty');
      return res.status(500).json({ error: 'Failed to calculate issue difficulty' });
    }
  }
}