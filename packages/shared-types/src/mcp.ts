// ── MCP Tool Contract Types ──────────────────────
export const MCP_RUNTIME = true;

import type { RepoAnalysis, Repository } from './repo';
import type { DiagramData, GraphLevel } from './graph';
import type { QueryResponse } from './rag';
import type { BranchContext } from './branch';
import type { SecurityReport } from './security';
import type { SkillProfile } from './user';

// ── analyze_repository ──
export interface AnalyzeRepoInput {
  url: string;
  branch?: string;
}

export interface AnalyzeRepoOutput {
  repo: Repository;
  analysis: RepoAnalysis;
}

// ── query_codebase ──
export interface QueryCodebaseInput {
  repoId: string;
  question: string;
  maxCitations?: number;
}

export type QueryCodebaseOutput = QueryResponse;

// ── get_branch_context ──
export interface GetBranchContextInput {
  repoId: string;
  branch: string;
  files?: string[];
}

export type GetBranchContextOutput = BranchContext;

// ── get_architecture_diagram ──
export interface GetArchitectureDiagramInput {
  repoId: string;
  level?: GraphLevel;
}

export type GetArchitectureDiagramOutput = DiagramData;

// ── get_data_flow_diagram ──
export interface GetDataFlowDiagramInput {
  repoId: string;
  entrypoint: string;
}

export interface FlowData extends DiagramData {
  certaintyAnnotations: Record<string, number>;
}

export type GetDataFlowDiagramOutput = FlowData;

// ── get_security_report ──
export interface GetSecurityReportInput {
  repoId: string;
}

export type GetSecurityReportOutput = SecurityReport;

// ── get_skill_profile ──
export interface GetSkillProfileInput {
  userId: string;
}

export type GetSkillProfileOutput = SkillProfile;
