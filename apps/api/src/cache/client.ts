// ── Redis Client ────────────────────────────────
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../observability/logger';

const redisUrl = config.redis.url ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
