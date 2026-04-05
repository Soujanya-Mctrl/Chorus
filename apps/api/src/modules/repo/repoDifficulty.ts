// ── Repo Difficulty Calculator ──────────────────
// Calculates a personalized "Contribution Ramp" score (1–5) for a repo
// based on the overlap between the user's GitHub language profile and
// the repo's language breakdown. No RAG needed — pure formula.

import { Octokit } from '@octokit/rest';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserLanguageProfile {
  [language: string]: number; // language → % of user's repos using this lang (0–100)
}

export interface RepoLanguageBreakdown {
  [language: string]: number; // language → bytes of code
}

export interface RepoDifficultyResult {
  rampScore: number;         // 1–5 (1 = very familiar, 5 = very unfamiliar)
  rampLabel: string;         // Human-readable label
  familiarityPercent: number; // 0–100: how much of the repo the user "knows"
  dominantLanguages: string[]; // top languages in the repo
  userKnownLanguages: string[]; // which of those the user knows
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RAMP_LABELS: Record<number, string> = {
  1: 'Quick Start',
  2: 'Gentle Ramp',
  3: 'Moderate Ramp',
  4: 'Steep Ramp',
  5: 'Summit Challenge',
};

// Complexity signals add a multiplier on top of language familiarity
const COMPLEXITY_CAPS = {
  maxFiles: 500,
  maxDeps: 50,
};

// ─── GitHub Data Fetchers ─────────────────────────────────────────────────────

/**
 * Fetches the language breakdown (in bytes) for a repo from GitHub API.
 * Returns normalized percentages (0–100).
 */
export async function fetchRepoLanguages(
  owner: string,
  repo: string,
  githubToken?: string,
): Promise<RepoLanguageBreakdown> {
  const octokit = new Octokit({ auth: githubToken ?? process.env.GITHUB_TOKEN });
  const { data } = await octokit.repos.listLanguages({ owner, repo });

  // data = { TypeScript: 102400, Python: 51200, ... } (bytes)
  const totalBytes = Object.values(data).reduce((sum, b) => sum + b, 0);
  if (totalBytes === 0) return {};

  const normalized: RepoLanguageBreakdown = {};
  for (const [lang, bytes] of Object.entries(data)) {
    normalized[lang] = (bytes / totalBytes) * 100;
  }
  return normalized;
}

/**
 * Fetches the user's language profile from GitHub:
 * iterates their public repos and counts language occurrences.
 * Returns normalized percentages (0–100).
 */
export async function fetchUserLanguageProfile(
  username: string,
  githubToken?: string,
): Promise<UserLanguageProfile> {
  const octokit = new Octokit({ auth: githubToken ?? process.env.GITHUB_TOKEN });

  // Fetch up to 100 of the user's most recently pushed repos
  const { data: repos } = await octokit.repos.listForUser({
    username,
    per_page: 100,
    sort: 'pushed',
    type: 'owner',
  });

  // Count repos per primary language (GitHub provides `language` field per repo)
  const langCounts: Record<string, number> = {};
  let totalWithLang = 0;

  for (const repo of repos) {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] ?? 0) + 1;
      totalWithLang++;
    }
  }

  if (totalWithLang === 0) return {};

  const profile: UserLanguageProfile = {};
  for (const [lang, count] of Object.entries(langCounts)) {
    profile[lang] = (count / totalWithLang) * 100;
  }
  return profile;
}

// ─── Complexity Modifier ──────────────────────────────────────────────────────

/**
 * Returns a multiplier (1.0–1.5) based on structural complexity signals.
 * This is applied on top of the language familiarity score.
 */
function computeComplexityMultiplier(signals: {
  fileCount: number;
  dependencyCount: number;
  hasContributingGuide: boolean;
  hasTests: boolean;
}): number {
  let multiplier = 1.0;

  if (signals.fileCount > COMPLEXITY_CAPS.maxFiles) multiplier += 0.15;
  if (signals.dependencyCount > COMPLEXITY_CAPS.maxDeps) multiplier += 0.1;
  if (!signals.hasContributingGuide) multiplier += 0.15;
  if (!signals.hasTests) multiplier += 0.1;

  return Math.min(multiplier, 1.5); // hard cap
}

// ─── Core Formula ─────────────────────────────────────────────────────────────

/**
 * Calculates a personalized contribution ramp score for a repo.
 *
 * Algorithm:
 *   1. For each language in the repo, compute: userFamiliarity × repoWeight
 *   2. Sum = overall familiarity score (0–1)
 *   3. difficultyRaw = 1 - familiarityScore
 *   4. Apply complexity multiplier
 *   5. Map to 1–5 ramp scale
 */
export function calculateRepoDifficulty(
  userProfile: UserLanguageProfile,
  repoLanguages: RepoLanguageBreakdown,
  complexitySignals?: {
    fileCount?: number;
    dependencyCount?: number;
    hasContributingGuide?: boolean;
    hasTests?: boolean;
  },
): RepoDifficultyResult {
  let familiarityScore = 0;
  const dominantLanguages: string[] = [];
  const userKnownLanguages: string[] = [];

  // Normalize repo language percentages to 0–1 weights
  const totalPercent = Object.values(repoLanguages).reduce((s, v) => s + v, 0);

  for (const [lang, rawPercent] of Object.entries(repoLanguages)) {
    const repoWeight = totalPercent > 0 ? rawPercent / totalPercent : 0;
    const userFamiliarity = (userProfile[lang] ?? 0) / 100;

    familiarityScore += userFamiliarity * repoWeight;

    // Track dominant repo languages (> 5% of codebase)
    if (rawPercent > 5) {
      dominantLanguages.push(lang);
      if (userFamiliarity > 0.1) {
        userKnownLanguages.push(lang);
      }
    }
  }

  // Apply complexity multiplier if signals are provided
  const multiplier = complexitySignals
    ? computeComplexityMultiplier({
        fileCount: complexitySignals.fileCount ?? 0,
        dependencyCount: complexitySignals.dependencyCount ?? 0,
        hasContributingGuide: complexitySignals.hasContributingGuide ?? true,
        hasTests: complexitySignals.hasTests ?? true,
      })
    : 1.0;

  // difficultyRaw is 0 (fully familiar) → 1 (completely unknown)
  const difficultyRaw = Math.min(1, (1 - familiarityScore) * multiplier);

  // Map 0–1 to 1–5 ramp scale
  const rampScore = Math.round(difficultyRaw * 4) + 1;
  const clamped = Math.min(5, Math.max(1, rampScore)) as 1 | 2 | 3 | 4 | 5;

  return {
    rampScore: clamped,
    rampLabel: RAMP_LABELS[clamped],
    familiarityPercent: Math.round(familiarityScore * 100),
    dominantLanguages,
    userKnownLanguages,
  };
}