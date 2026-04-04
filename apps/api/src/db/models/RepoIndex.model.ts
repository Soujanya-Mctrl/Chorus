// ── RepoIndex Mongoose Model ────────────────────
// Tracks which repos have been indexed, their commit hash, and chunk stats.
// Used by the vector store writer to skip re-indexing unchanged repos.
import mongoose, { Schema, type Document } from 'mongoose';

export interface IRepoIndex extends Document {
  repoId: string;           // "owner/repo"
  commitHash: string | null; // Latest indexed commit SHA
  defaultBranch: string;
  sizeKB: number;
  fileCount: number;
  chunkCount: number;
  embeddingModel: string;
  updatedAt: Date;
}

const RepoIndexSchema = new Schema<IRepoIndex>(
  {
    repoId: { type: String, required: true, unique: true },
    commitHash: { type: String, default: null },
    defaultBranch: { type: String, default: 'main' },
    sizeKB: { type: Number, default: 0 },
    fileCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    embeddingModel: { type: String, default: '' },
  },
  { timestamps: true },
);

export const RepoIndexModel = mongoose.model<IRepoIndex>('RepoIndex', RepoIndexSchema);
