// ── Repo Module Routes ──────────────────────────

import { Router } from 'express';
import { RepoController } from './repo.controller';

const router = Router();
const controller = new RepoController();

router.post('/analyze', controller.analyze);
router.get('/:id', controller.getById);
router.get('/', controller.list);

// Issue difficulty — uses RAG for file discovery + formula for scoring
// GET /api/repo/:repoId/issues/:issueNumber/difficulty?githubUsername=xxx
// Note: repoId must be URL-encoded ("owner%2Frepo")
router.get('/:repoId/issues/:issueNumber/difficulty', controller.getIssueDifficulty);

export { router as repoRoutes };