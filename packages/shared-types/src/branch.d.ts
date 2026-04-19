export interface BranchContext {
    repoId: string;
    currentBranch: string;
    commitSha: string;
    activeBranches: BranchActivity[];
    conflicts: ConflictSignal[];
    generatedAt: Date;
}
export interface BranchActivity {
    branchName: string;
    lastCommitAt: Date;
    author: string;
    filesChanged: string[];
    commitCount: number;
    aheadBehind: {
        ahead: number;
        behind: number;
    };
}
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface ConflictSignal {
    id: string;
    severity: ConflictSeverity;
    sourceBranch: string;
    targetBranch: string;
    conflictingFiles: string[];
    description: string;
    detectedAt: Date;
}
//# sourceMappingURL=branch.d.ts.map