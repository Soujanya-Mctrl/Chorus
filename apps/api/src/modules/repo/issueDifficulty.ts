// ── Issue Difficulty Calculator ──────────────────
// Calculates personalized issue difficulty using a hybrid approach:
//   - RAG retrieval: find which files this issue touches (semantic search)
//   - Formula: score difficulty based on user's familiarity with those files
// This does NOT change any existing RAG output.

import { Octokit } from '@octokit/rest';
import { retrieve } from '../../rag/retrieval/retriever';
import type { UserLanguageProfile } from '../repo/repoDifficulty';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IssueData {
  number: number;
  title: string;
  body: string;
  labels: string[];
  commentCount: number;
  hasLinkedPR: boolean;
}

export interface IssueDifficultyResult {
  score: number;           // 1–5
  label: string;           // "Beginner Friendly" → "Expert Level"
  components: {
    structuralComplexity: number;  // 1–5: based on labels, PR links, comments
    languageFamiliarity: number;   // 1–5: based on files touched vs user profile
    combined: number;              // weighted average
  };
  relevantFiles: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    symbolName?: string | null;
  }>;
  explanation: string;     // Human-readable reason for the score
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner Friendly',
  2: 'Easy',
  3: 'Moderate',
  4: 'Advanced',
  5: 'Expert Level',
};

// Labels that indicate higher structural complexity
const HIGH_COMPLEXITY_LABELS = new Set([
  'breaking-change', 'breaking change', 'refactor', 'architecture',
  'performance', 'security', 'regression',
]);
const FEATURE_LABELS = new Set(['feature', 'enhancement', 'feat']);
const BUG_LABELS = new Set(['bug', 'fix', 'bugfix']);

// ─── GitHub Issue Fetcher ─────────────────────────────────────────────────────

export async function fetchIssueData(
  owner: string,
  repo: string,
  issueNumber: number,
  githubToken?: string,
): Promise<IssueData> {
  const octokit = new Octokit({ auth: githubToken ?? process.env.GITHUB_TOKEN });

  const [issueResponse, timelineResponse] = await Promise.all([
    octokit.issues.get({ owner, repo, issue_number: issueNumber }),
    octokit.issues.listEventsForTimeline({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 30,
    }).catch(() => ({ data: [] })),
  ]);

  const issue = issueResponse.data;

  // Check if any timeline event is a cross-referenced PR
  const hasLinkedPR = timelineResponse.data.some(
    (event: { event?: string }) => event.event === 'cross-referenced',
  );

  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? '',
    labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
    commentCount: issue.comments,
    hasLinkedPR,
  };
}

// ─── Structural Complexity (Formula) ─────────────────────────────────────────

/**
 * Scores structural complexity from 1–5 using issue metadata.
 * No RAG or AI needed — pure signal calculation.
 */
function calculateStructuralComplexity(issue: IssueData): number {
  let score = 1;

  const labelNames = issue.labels.map((l) => l.toLowerCase());

  // Breaking changes or architectural work = maximum complexity signal
  if (labelNames.some((l) => HIGH_COMPLEXITY_LABELS.has(l))) score += 3;
  // Feature requests are moderately complex
  else if (labelNames.some((l) => FEATURE_LABELS.has(l))) score += 1;
  // Bugs with many comments = contested/complex
  else if (labelNames.some((l) => BUG_LABELS.has(l)) && issue.commentCount > 5) score += 1;

  // Many comments = issue is debated or complicated
  if (issue.commentCount > 15) score += 2;
  else if (issue.commentCount > 8) score += 1;

  // Already has a linked PR = someone tried and may have left breadcrumbs
  // Slightly reduces complexity since there's a reference implementation
  if (issue.hasLinkedPR) score = Math.max(1, score - 1);

  // Long body = lots of context to understand
  if (issue.body.length > 2000) score += 1;

  return Math.min(5, Math.max(1, score));
}

// ─── Language Familiarity via RAG (Retrieval Only) ───────────────────────────

/**
 * Uses RAG retrieval to find which files this issue relates to,
 * then scores how familiar the user is with those files' languages.
 *
 * RAG is used ONLY for file discovery — not for LLM generation.
 * The existing retriever is called as-is; no changes to RAG output.
 */
async function calculateLanguageFamiliarity(
  issue: IssueData,
  repoId: string,
  userProfile: UserLanguageProfile,
): Promise<{ score: number; relevantFiles: IssueDifficultyResult['relevantFiles'] }> {
  // Build a retrieval query from the issue title + body
  const query = `${issue.title}\n\n${issue.body.slice(0, 500)}`;

  let retrievedChunks: Awaited<ReturnType<typeof retrieve>>['chunks'] = [];

  try {
    const retrieval = await retrieve(query, {
      repoId,
      topK: 8,
      minScore: 0.25, // Lower threshold — we want broad coverage for issue mapping
    });
    retrievedChunks = retrieval.chunks;
  } catch (err) {
    console.warn('[IssueDifficulty] RAG retrieval failed, falling back to neutral score:', err);
    // If RAG fails, return neutral score — don't break the feature
    return { score: 3, relevantFiles: [] };
  }

  if (retrievedChunks.length === 0) {
    return { score: 3, relevantFiles: [] }; // Neutral if nothing found
  }

  // Extract language distribution from retrieved chunks
  // Weight languages by how many chunks reference them (proxy for relevance)
  const langChunkCounts: Record<string, number> = {};
  for (const chunk of retrievedChunks) {
    langChunkCounts[chunk.language] = (langChunkCounts[chunk.language] ?? 0) + 1;
  }

  const totalChunks = retrievedChunks.length;
  const chunkLanguageBreakdown: Record<string, number> = {};
  for (const [lang, count] of Object.entries(langChunkCounts)) {
    // Normalize to 0–100 percentage by chunk proportion
    chunkLanguageBreakdown[lang] = (count / totalChunks) * 100;
  }

  // Score familiarity: weighted sum of (userFamiliarity × chunkWeight)
  let familiarityScore = 0;
  for (const [lang, chunkPercent] of Object.entries(chunkLanguageBreakdown)) {
    const weight = chunkPercent / 100;
    const userFamiliarity = (userProfile[lang] ?? 0) / 100;
    familiarityScore += userFamiliarity * weight;
  }

  // familiarityScore: 0 (user knows none of these languages) → 1 (fully familiar)
  // Map to 1–5 difficulty scale (inverted: high familiarity = low difficulty)
  const difficultyRaw = 1 - familiarityScore;
  const langScore = Math.round(difficultyRaw * 4) + 1;
  const clampedScore = Math.min(5, Math.max(1, langScore));

  // Build relevant files list for the response
  const relevantFiles = retrievedChunks.slice(0, 5).map((c) => ({
    filePath: c.filePath,
    startLine: c.startLine,
    endLine: c.endLine,
    symbolName: c.symbolName,
  }));

  return { score: clampedScore, relevantFiles };
}

// ─── Combined Score ───────────────────────────────────────────────────────────

function buildExplanation(
  issue: IssueData,
  structuralScore: number,
  langScore: number,
  combined: number,
  relevantFiles: IssueDifficultyResult['relevantFiles'],
): string {
  const parts: string[] = [];

  if (structuralScore >= 4) {
    parts.push('This issue involves high structural complexity based on its labels and discussion.');
  } else if (structuralScore <= 2) {
    parts.push('This issue appears structurally straightforward.');
  }

  if (langScore >= 4) {
    parts.push('The relevant code uses languages you have limited experience with.');
  } else if (langScore <= 2) {
    parts.push('The relevant code is in languages you know well.');
  }

  if (relevantFiles.length > 0) {
    parts.push(`Key files to look at: ${relevantFiles.map((f) => f.filePath).join(', ')}.`);
  }

  return parts.join(' ') || `Difficulty score of ${combined}/5 based on code and issue analysis.`;
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

/**
 * Main function: calculates personalized issue difficulty.
 *
 * @param owner        - GitHub repo owner
 * @param repo         - GitHub repo name
 * @param repoId       - "owner/repo" string used as RAG repoId
 * @param issueNumber  - GitHub issue number
 * @param userProfile  - User's language profile from fetchUserLanguageProfile()
 * @param githubToken  - Optional GitHub token for higher rate limits
 */
export async function calculateIssueDifficulty(
  owner: string,
  repo: string,
  repoId: string,
  issueNumber: number,
  userProfile: UserLanguageProfile,
  githubToken?: string,
): Promise<IssueDifficultyResult> {
  // Fetch issue data and run both calculations in parallel
  const issueData = await fetchIssueData(owner, repo, issueNumber, githubToken);

  const [structuralScore, { score: langScore, relevantFiles }] = await Promise.all([
    Promise.resolve(calculateStructuralComplexity(issueData)),
    calculateLanguageFamiliarity(issueData, repoId, userProfile),
  ]);

  // Weighted average: structural complexity and language familiarity equally weighted
  const combined = Math.round((structuralScore + langScore) / 2);
  const clamped = Math.min(5, Math.max(1, combined)) as 1 | 2 | 3 | 4 | 5;

  return {
    score: clamped,
    label: DIFFICULTY_LABELS[clamped],
    components: {
      structuralComplexity: structuralScore,
      languageFamiliarity: langScore,
      combined: clamped,
    },
    relevantFiles,
    explanation: buildExplanation(issueData, structuralScore, langScore, clamped, relevantFiles),
  };
}