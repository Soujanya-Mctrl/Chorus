// ── Index Repo Job Registration ─────────────────
import { Worker } from 'bullmq';
import { QueueName } from '@chorus/shared-types';
import type { IndexRepoJobPayload } from '@chorus/shared-types';
import { processIndexRepo } from '../processors/indexRepo.processor';
import Redis from 'ioredis';

export function registerIndexRepoJob() {
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

  new Worker<IndexRepoJobPayload>(
    QueueName.INDEX_REPO,
    async (job) => { await processIndexRepo(job.data); },
    { connection, concurrency: 2 },
  );
}
