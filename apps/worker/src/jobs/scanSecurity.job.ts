// ── Scan Security Job Registration ──────────────
import { Worker } from 'bullmq';
import { QueueName } from '@chorus/shared-types';
import type { ScanSecurityJobPayload } from '@chorus/shared-types';
import { processScanSecurity } from '../processors/scanSecurity.processor';
import Redis from 'ioredis';

export function registerScanSecurityJob() {
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

  new Worker<ScanSecurityJobPayload>(
    QueueName.SCAN_SECURITY,
    async (job) => { await processScanSecurity(job.data); },
    { connection, concurrency: 2 },
  );
}
