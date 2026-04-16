export interface IndexRepoJobPayload {
    repoId: string;
    repoUrl: string;
    branch: string;
    userId: string;
    force?: boolean;
}
export interface UpdateGraphJobPayload {
    repoId: string;
    commitSha: string;
    changedFiles: string[];
    previousCommitSha: string;
}
export interface ScanSecurityJobPayload {
    repoId: string;
    repoUrl: string;
    branch: string;
}
export interface ReindexChunksJobPayload {
    repoId: string;
    reason: 'model-change' | 'manual' | 'schema-update';
    embeddingModel?: string;
}
export type JobPayload = IndexRepoJobPayload | UpdateGraphJobPayload | ScanSecurityJobPayload | ReindexChunksJobPayload;
export declare enum QueueName {
    INDEX_REPO = "index-repo",
    UPDATE_GRAPH = "update-graph",
    SCAN_SECURITY = "scan-security",
    REINDEX_CHUNKS = "reindex-chunks"
}
//# sourceMappingURL=jobs.d.ts.map