import { Router } from 'express';
import type { RetrieveProjectKnowledge } from '../../application/rag/RetrieveProjectKnowledge.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { createSuccessResponse } from '../../shared/ApiResponse.js';

/** HTTP adapter only: project authorization is applied by the shared project-path middleware. */
export function createKnowledgeSearchRoutes(retrieval: RetrieveProjectKnowledge): Router {
  const router = Router();
  router.post('/projects/:projectId/knowledge/search', asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const results = await retrieval.execute({ projectId: req.params.projectId, query: body.query, limit: body.limit, minimumSimilarity: body.minimumSimilarity, filters: body.filters });
    res.json(createSuccessResponse({ results, count: results.length }));
  }));
  return router;
}
