/**
 * vectorStoreWriter.ts
 * apps/api/src/rag/vectorstore/vectorStoreWriter.ts
 *
 * Writes embedded code chunks to MongoDB for Atlas Vector Search.
 * Replaces the previous Prisma/pgvector implementation.
 *
 * Strategies:
 *   - "skipped"       — commit hash unchanged, nothing to do
 *   - "full-reindex"  — commit changed, delete old chunks and insert fresh
 *   - "upsert"        — no commit hash available, upsert by chunkId
 */

import { ChunkModel } from "../../db/models/Chunk.model";
import { RepoIndexModel } from "../../db/models/RepoIndex.model";
import type { EmbeddedChunk } from "../embeddings/embeddingEngine";
import type { RepoMeta } from "../ingestion/githubFetcher";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WriteOptions {
  repoMeta: RepoMeta;
  commitHash?: string;       // Latest commit SHA fetched before indexing
  embeddingModel: string;    // e.g. "gemini-embedding-001"
}

export interface WriteResult {
  repoId: string;
  strategy: "skipped" | "full-reindex" | "upsert";
  chunksWritten: number;
  chunksDeleted: number;
  durationMs: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INSERT_BATCH_SIZE = 100; // Insert 100 chunks per batch

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function writeToVectorStore(
  embedded: EmbeddedChunk[],
  options: WriteOptions
): Promise<WriteResult> {
  const startTime = Date.now();
  const repoId = `${options.repoMeta.owner}/${options.repoMeta.repo}`;

  console.log(`\n[VectorStore] Writing ${embedded.length} chunks for ${repoId}`);

  // ── Commit Hash Check ──────────────────────────────────────────────────────
  if (options.commitHash) {
    const existing = await RepoIndexModel.findOne({ repoId });

    if (existing?.commitHash === options.commitHash) {
      const durationMs = Date.now() - startTime;
      console.log(
        `[VectorStore] ⏭️  Skipping ${repoId} — already indexed at commit ${options.commitHash.slice(0, 7)}`
      );
      return {
        repoId,
        strategy: "skipped",
        chunksWritten: 0,
        chunksDeleted: 0,
        durationMs,
      };
    }

    // Commit changed (or first time) → full reindex
    console.log(
      `[VectorStore] New commit detected (${options.commitHash.slice(0, 7)}). Full reindex.`
    );
    return await fullReindex(repoId, embedded, options, startTime);
  }

  // ── No Commit Hash → Upsert Fallback ──────────────────────────────────────
  console.log(`[VectorStore] No commit hash available. Using upsert fallback.`);
  return await upsertChunks(repoId, embedded, options, startTime);
}

// ─── Strategy A: Full Reindex ─────────────────────────────────────────────────

async function fullReindex(
  repoId: string,
  embedded: EmbeddedChunk[],
  options: WriteOptions,
  startTime: number
): Promise<WriteResult> {
  // Delete all existing chunks for this repo
  const deleteResult = await ChunkModel.deleteMany({ repoId });
  const chunksDeleted = deleteResult.deletedCount ?? 0;
  console.log(`[VectorStore] Deleted ${chunksDeleted} old chunks for ${repoId}`);

  // Insert all fresh chunks in batches
  const chunksWritten = await batchInsertChunks(embedded, options.embeddingModel);

  // Upsert the RepoIndex record with new commit hash
  await RepoIndexModel.findOneAndUpdate(
    { repoId },
    {
      repoId,
      commitHash: options.commitHash ?? null,
      defaultBranch: options.repoMeta.defaultBranch,
      sizeKB: options.repoMeta.sizeKB,
      fileCount: options.repoMeta.fileCount,
      chunkCount: chunksWritten,
      embeddingModel: options.embeddingModel,
    },
    { upsert: true, new: true }
  );

  const durationMs = Date.now() - startTime;
  console.log(`[VectorStore] ✅ Full reindex complete: ${chunksWritten} chunks written in ${durationMs}ms`);

  return { repoId, strategy: "full-reindex", chunksWritten, chunksDeleted, durationMs };
}

// ─── Strategy B: Upsert Fallback ─────────────────────────────────────────────

async function upsertChunks(
  repoId: string,
  embedded: EmbeddedChunk[],
  options: WriteOptions,
  startTime: number
): Promise<WriteResult> {
  let chunksWritten = 0;

  // Upsert in batches using bulkWrite
  for (let i = 0; i < embedded.length; i += INSERT_BATCH_SIZE) {
    const batch = embedded.slice(i, i + INSERT_BATCH_SIZE);

    const ops = batch.map((e) => ({
      updateOne: {
        filter: { chunkId: e.chunk.id },
        update: {
          $set: {
            chunkId: e.chunk.id,
            repoId: e.chunk.repoId,
            filePath: e.chunk.filePath,
            language: e.chunk.language,
            content: e.chunk.content,
            startLine: e.chunk.startLine,
            endLine: e.chunk.endLine,
            symbolName: e.chunk.symbolName ?? undefined,
            chunkIndex: e.chunk.chunkIndex,
            embedding: e.embedding,
            embeddingModel: options.embeddingModel,
            embeddedAt: e.embeddedAt,
          },
        },
        upsert: true,
      },
    }));

    await ChunkModel.bulkWrite(ops);
    chunksWritten += batch.length;

    console.log(
      `[VectorStore] Upserted batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}/${Math.ceil(embedded.length / INSERT_BATCH_SIZE)}`
    );
  }

  // Update RepoIndex
  await RepoIndexModel.findOneAndUpdate(
    { repoId },
    {
      repoId,
      commitHash: null,
      defaultBranch: options.repoMeta.defaultBranch,
      sizeKB: options.repoMeta.sizeKB,
      fileCount: options.repoMeta.fileCount,
      chunkCount: chunksWritten,
      embeddingModel: options.embeddingModel,
    },
    { upsert: true, new: true }
  );

  const durationMs = Date.now() - startTime;
  console.log(`[VectorStore] ✅ Upsert complete: ${chunksWritten} chunks in ${durationMs}ms`);

  return { repoId, strategy: "upsert", chunksWritten, chunksDeleted: 0, durationMs };
}

// ─── Batch Insert ─────────────────────────────────────────────────────────────

async function batchInsertChunks(
  embedded: EmbeddedChunk[],
  embeddingModel: string
): Promise<number> {
  let totalInserted = 0;

  for (let i = 0; i < embedded.length; i += INSERT_BATCH_SIZE) {
    const batch = embedded.slice(i, i + INSERT_BATCH_SIZE);

    const docs = batch.map((e) => ({
      chunkId: e.chunk.id,
      repoId: e.chunk.repoId,
      filePath: e.chunk.filePath,
      language: e.chunk.language,
      content: e.chunk.content,
      startLine: e.chunk.startLine,
      endLine: e.chunk.endLine,
      symbolName: e.chunk.symbolName ?? undefined,
      chunkIndex: e.chunk.chunkIndex,
      embedding: e.embedding,
      embeddingModel,
      embeddedAt: e.embeddedAt,
    }));

    await ChunkModel.insertMany(docs, { ordered: false });
    totalInserted += batch.length;

    console.log(
      `[VectorStore] Inserted batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}/${Math.ceil(embedded.length / INSERT_BATCH_SIZE)}`
    );
  }

  return totalInserted;
}

// ─── Commit Hash Fetcher ──────────────────────────────────────────────────────

/**
 * Fetches the latest commit SHA for a repo's default branch.
 * Called before the ingestion pipeline starts so we can decide
 * whether to skip or reindex.
 */
export async function fetchLatestCommitHash(
  owner: string,
  repo: string,
  defaultBranch: string,
  githubToken?: string
): Promise<string | null> {
  try {
    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN });

    const { data } = await octokit.repos.getBranch({ owner, repo, branch: defaultBranch });
    return data.commit.sha;
  } catch (err) {
    console.warn(`[VectorStore] Could not fetch commit hash for ${owner}/${repo}:`, err);
    return null;
  }
}