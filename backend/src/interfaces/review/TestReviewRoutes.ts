import { Router } from 'express';
import { TestCaseVersionService } from '../../application/requirements/TestCaseVersionService.js';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { createSuccessResponse } from '../../shared/ApiResponse.js';

export function createTestReviewRoutes(service: TestCaseVersionService, executionRuns?: Pick<ExecutionRunRepository, 'findByProject'>): Router {
  const router = Router();
  router.get('/projects/:projectId/test-review', asyncHandler(async (req, res) => { const lifecycle = req.query.lifecycle as any; const items = service.reviewQueue(req.params.projectId, lifecycle, req.query as any); const page = Math.max(1, Number(req.query.page) || 1); const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25)); res.json(createSuccessResponse({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize })); }));
  router.get('/projects/:projectId/test-cases/:testCaseId', asyncHandler(async (req,res) => { service.assertCaseProject(req.params.testCaseId, req.params.projectId); res.json(createSuccessResponse(service.current(req.params.testCaseId))); }));
  router.get('/projects/:projectId/test-cases/:testCaseId/history', asyncHandler(async (req,res) => { service.assertCaseProject(req.params.testCaseId, req.params.projectId); res.json(createSuccessResponse(service.history(req.params.testCaseId))); }));
  router.get('/projects/:projectId/test-case-versions/:versionId/traceability', asyncHandler(async (req,res) => {
    service.assertVersionProject(req.params.versionId, req.params.projectId);
    const trace = service.trace(req.params.versionId);
    const runs = executionRuns ? await executionRuns.findByProject(req.params.projectId) : [];
    const matchingSteps = runs.flatMap((run: any) => (run.stepResults || []).map((step: any) => ({ run, step })).filter(({ step }: any) => step.executionSnapshot?.testCaseVersionId === req.params.versionId));
    const latest = matchingSteps.sort((a: any, b: any) => (b.step.executionSnapshot?.capturedAt || 0) - (a.step.executionSnapshot?.capturedAt || 0))[0];
    res.json(createSuccessResponse(latest ? { ...trace, executionRunId: latest.run.id, executionSnapshot: latest.step.executionSnapshot, attempts: latest.step.attempts || [] } : trace));
  }));
  router.get('/projects/:projectId/test-case-versions/:versionId/diff/:otherVersionId', asyncHandler(async (req,res) => { service.assertVersionProject(req.params.versionId, req.params.projectId); service.assertVersionProject(req.params.otherVersionId, req.params.projectId); res.json(createSuccessResponse(service.diff(req.params.otherVersionId, req.params.versionId))); }));
  router.post('/projects/:projectId/test-case-versions/:versionId/:action', asyncHandler(async (req,res) => { service.assertVersionProject(req.params.versionId, req.params.projectId); const action = String(req.params.action).toUpperCase() as any; res.json(createSuccessResponse(service.review(req.params.versionId, action, req.auth?.subject || 'System', req.body?.reason))); }));
  router.patch('/projects/:projectId/test-case-versions/:versionId', asyncHandler(async (req,res) => { service.assertVersionProject(req.params.versionId, req.params.projectId); res.json(createSuccessResponse(service.edit(req.params.versionId, req.body))); }));
  router.post('/projects/:projectId/test-review/bulk', asyncHandler(async (req,res) => { const items = service.bulk(req.params.projectId, req.body.versionIds || [], req.body.action, req.auth?.subject || 'System', req.body.reason); res.json(createSuccessResponse({ items })); }));
  router.post('/projects/:projectId/test-review/suites/:suiteId', asyncHandler(async (req,res) => res.json(createSuccessResponse({ items: service.addToSuite(req.params.projectId, req.params.suiteId, req.body.versionIds || []) }))));
  router.get('/projects/:projectId/test-review/coverage', asyncHandler(async (req,res) => res.json(createSuccessResponse(service.coverage(req.params.projectId)))));
  return router;
}
