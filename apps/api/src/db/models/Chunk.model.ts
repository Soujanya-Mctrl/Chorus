// ── Chunk Mongoose Model ────────────────────────
// Used for RAG: stores code chunks with embeddings for Atlas Vector Search
import mongoose, { Schema, type Document } from 'mongoose';

export interface IChunk extends Document {
  chunkId: string;         // Deterministic ID: "owner_repo__path__L{line}"
  repoId: string;          // "owner/repo"
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  chunkType: string;
  symbolName?: string;
  chunkIndex: number;
  embedding: number[];     // 768-dim vector for Gemini, 384-dim for Xenova
  embeddingModel: string;  // Which model generated the embedding
  embeddedAt: Date;
  metadata?: {
    imports?: string[];
    exports?: string[];
    dependencies?: string[];
    complexity?: number;
    tokenCount?: number;
  };
}

const ChunkSchema = new Schema<IChunk>(
  {
    chunkId: { type: String, required: true, unique: true },
    repoId: { type: String, required: true, index: true },
    filePath: { type: String, required: true, index: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    content: { type: String, required: true },
    language: { type: String, required: true },
    chunkType: { type: String, default: 'block' },
    symbolName: String,
    chunkIndex: { type: Number, default: 0 },
    embedding: { type: [Number], required: true },
    embeddingModel: { type: String, required: true },
    embeddedAt: { type: Date, default: Date.now },
    metadata: {
      imports: [String],
      exports: [String],
      dependencies: [String],
      complexity: Number,
      tokenCount: Number,
    },
  },
  { timestamps: true },
);

// Index for efficient repo + file queries
ChunkSchema.index({ repoId: 1, filePath: 1 });

export const ChunkModel = mongoose.model<IChunk>('CodeChunk', ChunkSchema);
