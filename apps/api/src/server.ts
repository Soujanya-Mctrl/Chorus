// ── Chorus API Server ────────────────────────────

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { connectDatabase } from './db/connection';
import { repoRoutes } from './modules/repo/repo.routes';
import { graphRoutes } from './modules/graph/graph.routes';
import { branchRoutes } from './modules/branch/branch.routes';
import { ragRoutes } from './modules/rag/rag.routes';
import { securityRoutes } from './modules/security/security.routes';
import { userRoutes } from './modules/user/user.routes';
import { webhookRoutes } from './webhooks/webhook.routes';
import { logger } from './observability/logger';

const app = express();

// ── Middleware ──
app.use(helmet());
app.use(cors({ origin: `${process.env.CORS_ORIGINS}`, methods: ["GET", "POST", "PUT", "DELETE"], credentials: true }));
app.options("*", cors());
app.use(express.json({ limit: '10mb' }));

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/repo', repoRoutes);
app.use('/api/repo', graphRoutes);
app.use('/api/repo', branchRoutes);
app.use('/api/repo', ragRoutes);
app.use('/api/repo', securityRoutes);
app.use('/api/user', userRoutes);
app.use('/api/webhooks', webhookRoutes);

// ── Error Handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
async function start() {
  await connectDatabase();
  app.listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => {
    logger.info(`Chorus API listening on port ${process.env.PORT || 3001}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

export default app;
