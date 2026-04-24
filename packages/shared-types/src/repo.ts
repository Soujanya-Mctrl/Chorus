// ── Repository Types ──────────────────────────────
export const REPO_RUNTIME = true;

export interface Repository {
  id: string;
  repoUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  openIssues: number;
  lastAnalyzedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepoAnalysis {
  repoId: string;
  difficulty: DifficultyScore;
  health: HealthSignal;
  summary: string;
  totalFiles: number;
  totalLinesOfCode: number;
  languages: Record<string, number>;
  beginnerIssues: BeginnerIssue[];
  analyzedAt: Date;
}

export interface DifficultyScore {
  overall: number; // 1-10
  codeComplexity: number;
  architectureComplexity: number;
  documentationQuality: number;
  testCoverage: number;
  label: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface HealthSignal {
  overallScore: number; // 0-100
  activityLevel: 'active' | 'moderate' | 'inactive' | 'archived';
  lastCommitAt: Date;
  contributorCount: number;
  openIssueCount: number;
  hasReadme: boolean;
  hasLicense: boolean;
  hasCi: boolean;
}

export interface BeginnerIssue {
  issueNumber: number;
  title: string;
  url: string;
  labels: string[];
  createdAt: Date;
}

export type IndexingStatus = 'pending' | 'cloning' | 'chunking' | 'embedding' | 'graphing' | 'complete' | 'failed';

export interface IndexingProgress {
  repoId: string;
  status: IndexingStatus;
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}
