import type { RepoAnalysis, Repository } from './repo';
import type { DiagramData, GraphLevel } from './graph';
import type { QueryResponse } from './rag';
import type { BranchContext } from './branch';
import type { SecurityReport } from './security';
import type { SkillProfile } from './user';
export interface AnalyzeRepoInput {
    url: string;
    branch?: string;
}
export interface AnalyzeRepoOutput {
    repo: Repository;
    analysis: RepoAnalysis;
}
export interface QueryCodebaseInput {
    repoId: string;
    question: string;
    maxCitations?: number;
}
export type QueryCodebaseOutput = QueryResponse;
export interface GetBranchContextInput {
    repoId: string;
    branch: string;
    files?: string[];
}
export type GetBranchContextOutput = BranchContext;
export interface GetArchitectureDiagramInput {
    repoId: string;
    level?: GraphLevel;
}
export type GetArchitectureDiagramOutput = DiagramData;
export interface GetDataFlowDiagramInput {
    repoId: string;
    entrypoint: string;
}
export interface FlowData extends DiagramData {
    certaintyAnnotations: Record<string, number>;
}
export type GetDataFlowDiagramOutput = FlowData;
export interface GetSecurityReportInput {
    repoId: string;
}
export type GetSecurityReportOutput = SecurityReport;
export interface GetSkillProfileInput {
    userId: string;
}
export type GetSkillProfileOutput = SkillProfile;
//# sourceMappingURL=mcp.d.ts.map