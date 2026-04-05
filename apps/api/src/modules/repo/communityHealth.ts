// ── Community Health Calculator ──────────────────
// Calculates a 0–100% health score for a repo based on GitHub API signals.
// No RAG needed — pure formula over structured GitHub data.

import { Octokit } from '@octokit/rest';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommunityHealthInputs {
  // Issues
  totalOpenIssues: number;
  issuesWithMaintainerResponse: number; // issues where a maintainer/collaborator commented
  avgIssueResponseTimeHours: number;    // avg hours to first maintainer reply

  // Commits
  commitsLast30Days: number;
  commitsLast90Days: number;
  lastCommitDaysAgo: number;

  // PRs
  prsClosedLast30Days: number;
  avgPRMergeTimeDays: number;
}

export interface CommunityHealthResult {
  score: number;         // 0–100
  label: string;         // "Very Active" | "Moderately Active" | "Slow-moving" | "Potentially Inactive"
  labelColor: string;    // For UI: "green" | "yellow" | "orange" | "red"
  breakdown: {
    responsivenessScore: number; // 0–40
    activityScore: number;       // 0–40
    prHealthScore: number;       // 0–20
  };
}

// ─── GitHub Data Fetcher ──────────────────────────────────────────────────────

/**
 * Fetches all raw signals needed for community health calculation.
 * Uses GitHub API only — no LLM/RAG calls.
 */
export async function fetchCommunityHealthInputs(
  owner: string,
  repo: string,
  githubToken?: string,
): Promise<CommunityHealthInputs> {
  const octokit = new Octokit({ auth: githubToken ?? process.env.GITHUB_TOKEN });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // ── Fetch in parallel ──────────────────────────────────────────────────────
  const [repoData, recentIssues, commits30, commits90, recentPRs] = await Promise.all([
    octokit.repos.get({ owner, repo }),

    // Open issues updated in last 90 days (includes responses)
    octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100,
      since: ninetyDaysAgo.toISOString(),
    }).catch(() => ({ data: [] })),

    // Commits in last 30 days
    octokit.repos.listCommits({
      owner,
      repo,
      since: thirtyDaysAgo.toISOString(),
      per_page: 100,
    }).catch(() => ({ data: [] })),

    // Commits in last 90 days
    octokit.repos.listCommits({
      owner,
      repo,
      since: ninetyDaysAgo.toISOString(),
      per_page: 100,
    }).catch(() => ({ data: [] })),

    // Recently closed PRs
    octokit.pulls.list({
      owner,
      repo,
      state: 'closed',
      per_page: 30,
      sort: 'updated',
      direction: 'desc',
    }).catch(() => ({ data: [] })),
  ]);

  // ── Fetch repo collaborators to identify maintainer responses ──────────────
  let maintainerLogins = new Set<string>();
  try {
    const { data: collaborators } = await octokit.repos.listCollaborators({
      owner,
      repo,
      per_page: 100,
    });
    maintainerLogins = new Set(collaborators.map((c) => c.login));
    // Always include the repo owner
    maintainerLogins.add(owner);
  } catch {
    // Collaborator list may be private — fall back to owner only
    maintainerLogins = new Set([owner]);
  }

  // ── Calculate issue responsiveness ────────────────────────────────────────
  let issuesWithMaintainerResponse = 0;
  const responseTimesHours: number[] = [];

  // For each open issue, check if a maintainer has commented
  // We sample the first 20 issues to avoid excessive API calls
  const sampleIssues = recentIssues.data.filter((i) => !i.pull_request).slice(0, 20);

  for (const issue of sampleIssues) {
    if (issue.comments === 0) continue;

    try {
      const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
        per_page: 20,
      });

      const maintainerComment = comments.find((c) => maintainerLogins.has(c.user?.login ?? ''));

      if (maintainerComment) {
        issuesWithMaintainerResponse++;

        // Response time = hours between issue created and first maintainer reply
        const createdAt = new Date(issue.created_at).getTime();
        const firstReply = new Date(maintainerComment.created_at).getTime();
        const hoursToResponse = (firstReply - createdAt) / (1000 * 60 * 60);
        responseTimesHours.push(hoursToResponse);
      }
    } catch {
      // Skip this issue if comments can't be fetched
    }
  }

  const avgIssueResponseTimeHours =
    responseTimesHours.length > 0
      ? responseTimesHours.reduce((s, h) => s + h, 0) / responseTimesHours.length
      : 168; // Default to 7 days if no data

  // ── Calculate PR merge time ────────────────────────────────────────────────
  const prsClosedThisMonth = recentPRs.data.filter(
    (pr) => pr.merged_at && new Date(pr.merged_at) >= thirtyDaysAgo,
  );

  const prMergeTimes = prsClosedThisMonth
    .filter((pr) => pr.merged_at)
    .map((pr) => {
      const created = new Date(pr.created_at).getTime();
      const merged = new Date(pr.merged_at!).getTime();
      return (merged - created) / (1000 * 60 * 60 * 24); // days
    });

  const avgPRMergeTimeDays =
    prMergeTimes.length > 0
      ? prMergeTimes.reduce((s, d) => s + d, 0) / prMergeTimes.length
      : 30; // Default to 30 days if no data

  // ── Last commit age ────────────────────────────────────────────────────────
  const lastCommitDate = repoData.data.pushed_at
    ? new Date(repoData.data.pushed_at)
    : new Date(0);
  const lastCommitDaysAgo = (now.getTime() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);

  return {
    totalOpenIssues: repoData.data.open_issues_count,
    issuesWithMaintainerResponse,
    avgIssueResponseTimeHours,
    commitsLast30Days: commits30.data.length,
    commitsLast90Days: commits90.data.length,
    lastCommitDaysAgo,
    prsClosedLast30Days: prsClosedThisMonth.length,
    avgPRMergeTimeDays,
  };
}

// ─── Core Formula ─────────────────────────────────────────────────────────────

/**
 * Calculates community health as a 0–100 score.
 *
 * Scoring breakdown:
 *   Responsiveness  (40 pts): maintainer response rate + response speed
 *   Activity        (40 pts): commit frequency + recency
 *   PR Health       (20 pts): PR merge speed
 */
export function calculateCommunityHealth(inputs: CommunityHealthInputs): CommunityHealthResult {
  let score = 0;

  // ── Responsiveness (40 pts) ────────────────────────────────────────────────

  // Response rate: what % of sampled issues got a maintainer reply (up to 20 pts)
  const sampleSize = Math.min(inputs.totalOpenIssues, 20);
  const responseRate =
    sampleSize > 0 ? inputs.issuesWithMaintainerResponse / sampleSize : 0;
  const responsivenessRateScore = responseRate * 20;

  // Response speed: < 24hrs = full 20 pts, degrades linearly to 0 at 168hrs (7 days)
  const responseSpeedScore = Math.max(0, 1 - inputs.avgIssueResponseTimeHours / 168) * 20;

  const responsivenessScore = Math.round(responsivenessRateScore + responseSpeedScore);
  score += responsivenessScore;

  // ── Activity (40 pts) ──────────────────────────────────────────────────────

  // Recent commits are worth more than older ones
  // 20 commits/month = full score for 30-day window
  // 60 commits/90 days = full score for 90-day window
  const commit30Score = Math.min(inputs.commitsLast30Days / 20, 1) * 25;
  const commit90Score = Math.min(inputs.commitsLast90Days / 60, 1) * 10;
  let activityScore = Math.min(commit30Score + commit90Score, 35);

  // Penalize stale repos
  if (inputs.lastCommitDaysAgo > 180) activityScore -= 15;
  else if (inputs.lastCommitDaysAgo > 90) activityScore -= 7;

  activityScore = Math.max(0, Math.round(activityScore));
  score += activityScore;

  // ── PR Health (20 pts) ─────────────────────────────────────────────────────

  // < 3 days merge time = full 20 pts, degrades linearly to 0 at 30 days
  const prHealthScore = Math.round(Math.max(0, 1 - inputs.avgPRMergeTimeDays / 30) * 20);
  score += prHealthScore;

  // ── Final clamp ────────────────────────────────────────────────────────────
  const finalScore = Math.min(100, Math.max(0, score));

  return {
    score: finalScore,
    label: scoreToLabel(finalScore).label,
    labelColor: scoreToLabel(finalScore).color,
    breakdown: {
      responsivenessScore,
      activityScore,
      prHealthScore,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Very Active', color: 'green' };
  if (score >= 60) return { label: 'Moderately Active', color: 'yellow' };
  if (score >= 40) return { label: 'Slow-moving', color: 'orange' };
  return { label: 'Potentially Inactive', color: 'red' };
}