// ── Update Graph Job Registration ───────────────
import { Worker } from 'bullmq';
import { QueueName } from '@chorus/shared-types';
import type { UpdateGraphJobPayload } from '@chorus/shared-types';
import { processUpdateGraph } from '../processors/updateGraph.processor';
import Redis from 'ioredis';

export function registerUpdateGraphJob() {
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

  new Worker<UpdateGraphJobPayload>(
    QueueName.UPDATE_GRAPH,
    async (job) => { await processUpdateGraph(job.data); },
    { connection, concurrency: 3 },
  );
}
