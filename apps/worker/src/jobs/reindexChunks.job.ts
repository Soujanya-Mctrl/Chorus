// ── Reindex Chunks Job Registration ─────────────
import { Worker } from 'bullmq';
import { QueueName } from '@chorus/shared-types';
import type { ReindexChunksJobPayload } from '@chorus/shared-types';
import { processReindexChunks } from '../processors/reindexChunks.processor';
import Redis from 'ioredis';

export function registerReindexChunksJob() {
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

  new Worker<ReindexChunksJobPayload>(
    QueueName.REINDEX_CHUNKS,
    async (job) => { await processReindexChunks(job.data); },
    { connection, concurrency: 1 },
  );
}
