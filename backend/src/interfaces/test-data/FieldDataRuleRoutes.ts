import { Router } from 'express';
import { container } from '../../application/ApplicationContainer.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { createSuccessResponse } from '../../shared/ApiResponse.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CanonicalContractInput } from '../../application/test-data/FieldDataAnalyzer.js';
import { FieldDataRuleReconciliationService } from '../../application/test-data/FieldDataRuleReconciliationService.js';
import { FieldDataResolutionService } from '../../application/test-data/FieldDataResolutionService.js';
import { ExecutionDataPreviewService } from '../../application/test-data/ExecutionDataPreviewService.js';

const router = Router();
const snapshotFile = (projectId: string) => path.join(process.cwd(), 'data', 'test-data', projectId, 'canonical-field-analysis.json');
const loadSnapshot = (projectId: string): CanonicalContractInput[] => { try { return JSON.parse(fs.readFileSync(snapshotFile(projectId), 'utf8')).inputs || []; } catch { return []; } };
const saveSnapshot = (projectId: string, inputs: CanonicalContractInput[]) => { const file = snapshotFile(projectId); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify({ inputs, analyzedAt: Date.now() }, null, 2)); };
const canonicalInputs = async (projectId: string): Promise<CanonicalContractInput[]> => (await container.apiOperationRepository.findByProject(projectId)).flatMap((operation) => {
  const body = operation.sampleRequestBody || {}; const required = new Set(operation.requiredRequestBodyFields || []);
  return Object.entries(body).map(([path, value]) => ({ input: { operationId: operation.id, serviceId: operation.serviceId, protocol: 'canonical', location: 'BODY', path }, schema: { type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value, example: value }, required: required.has(path) }));
});
router.get('/projects/:projectId/field-data-rules', asyncHandler(async (req, res) => res.json(createSuccessResponse(await container.manageFieldDataRules.listByProject(req.params.projectId)))));
router.get('/projects/:projectId/field-data-rules/:ruleId', asyncHandler(async (req, res) => { const rule = await container.fieldDataRuleRepository.findById(req.params.ruleId); if (!rule || rule.projectId !== req.params.projectId) { res.status(404).json({ success: false, message: 'Rule not found' }); return; } res.json(createSuccessResponse(rule)); }));
router.post('/projects/:projectId/field-data-rules', asyncHandler(async (req, res) => res.status(201).json(createSuccessResponse(await container.manageFieldDataRules.create({ ...req.body, projectId: req.params.projectId })))));
router.patch('/projects/:projectId/field-data-rules/:ruleId', asyncHandler(async (req, res) => { const existing = await container.fieldDataRuleRepository.findById(req.params.ruleId); if (!existing || existing.projectId !== req.params.projectId) { res.status(404).json({ success: false, message: 'Rule not found' }); return; } res.json(createSuccessResponse(await container.manageFieldDataRules.update(existing.id, req.body))); }));
router.post('/projects/:projectId/field-data-rules/:ruleId/accept', asyncHandler(async (req, res) => res.json(createSuccessResponse(await container.manageFieldDataRules.acceptSuggestedRule(req.params.ruleId)))));
router.post('/projects/:projectId/field-data-rules/:ruleId/review-required', asyncHandler(async (req, res) => res.json(createSuccessResponse(await container.manageFieldDataRules.markReviewRequired(req.params.ruleId)))));
router.get('/projects/:projectId/field-data-analysis', asyncHandler(async (req, res) => { const rules = await container.manageFieldDataRules.listByProject(req.params.projectId); const summary = { totalInputs: rules.length, ready: rules.filter((r) => r.status === 'ACCEPTED').length, existingRulesReused: rules.filter((r) => r.status === 'ACCEPTED').length, generatedSuggestions: 0, runtimeLinkSuggestions: rules.filter((r) => r.valueStrategy === 'LINKED_RESPONSE').length, optionalAutoHandled: rules.filter((r) => !r.required).length, reviewRequired: rules.filter((r) => r.status === 'REVIEW_REQUIRED').length, unresolved: rules.filter((r) => r.status === 'SUGGESTED').length }; res.json(createSuccessResponse({ summary, suggestions: rules.filter((r) => r.status !== 'ACCEPTED') })); }));
router.post('/projects/:projectId/field-data-analysis/reanalyze', asyncHandler(async (req, res) => { const projectId = req.params.projectId; const rules = await container.manageFieldDataRules.listByProject(projectId); const current = await canonicalInputs(projectId); const previous = loadSnapshot(projectId); const analysis = container.fieldDataAnalyzer.analyze(current, rules, [], previous); const reconciliation = new FieldDataRuleReconciliationService().reconcile(current, previous, rules); for (const detail of reconciliation.details.filter((item) => ['MATERIAL_CHANGE', 'BREAKING_CHANGE'].includes(item.status) && item.ruleId)) await container.manageFieldDataRules.markReviewRequired(detail.ruleId!); saveSnapshot(projectId, current); res.json(createSuccessResponse({ ...reconciliation.summary, details: reconciliation.details, suggestions: analysis.suggestions.filter((item) => !item.reusedExistingRule), analysis: analysis.summary })); }));
router.get('/projects/:projectId/runtime-links', asyncHandler(async (req, res) => { const rules = await container.manageFieldDataRules.listByProject(req.params.projectId); res.json(createSuccessResponse(rules.filter((r) => r.valueStrategy === 'LINKED_RESPONSE'))); }));
router.post('/projects/:projectId/operations/:operationId/field-data-rule', asyncHandler(async (req, res) => {
  const operation = await container.apiOperationRepository.findById(req.params.operationId);
  if (!operation || operation.projectId !== req.params.projectId) { res.status(404).json({ success: false, message: 'Operation not found' }); return; }
  const input = { ...(req.body?.input || {}), operationId: operation.id, serviceId: operation.serviceId };
  if (!input.location || !input.path || !req.body?.semanticType || !req.body?.valueStrategy || !req.body?.changeScope) { res.status(400).json({ success: false, message: 'Canonical input, semantic type, strategy, and scope are required' }); return; }
  const existing = (await container.manageFieldDataRules.listByOperation(req.params.projectId, operation.id)).find((rule) => rule.scopeKind !== 'PROJECT_FALLBACK' && rule.input.location === input.location && rule.input.path === input.path);
  const ruleInput = { ...req.body, projectId: req.params.projectId, input, status: 'ACCEPTED', scopeKind: 'OPERATION' as const, reviewMetadata: { reviewer: req.auth?.subject || 'System', reviewedAt: Date.now() } };
  const rule = existing ? await container.manageFieldDataRules.update(existing.id, ruleInput) : await container.manageFieldDataRules.create(ruleInput);
  res.json(createSuccessResponse(rule));
}));
router.post('/projects/:projectId/project-data-defaults', asyncHandler(async (req, res) => {
  const input = req.body?.input || {};
  if (!input.location || !req.body?.semanticType || !req.body?.valueStrategy || !req.body?.changeScope) { res.status(400).json({ success: false, message: 'Canonical location, semantic type, strategy, and scope are required' }); return; }
  const defaultInput = { operationId: '__PROJECT_DEFAULT__', location: input.location, path: '*', protocol: input.protocol, semanticType: req.body.semanticType };
  const rules = await container.manageFieldDataRules.listByProject(req.params.projectId);
  const existing = rules.find((rule) => rule.scopeKind === 'PROJECT_FALLBACK' && rule.input.location === defaultInput.location && rule.semanticType === req.body.semanticType && (rule.input.protocol || '') === (defaultInput.protocol || ''));
  const ruleInput = { ...req.body, projectId: req.params.projectId, input: defaultInput, status: 'ACCEPTED', scopeKind: 'PROJECT_FALLBACK' as const, reviewMetadata: { reviewer: req.auth?.subject || 'System', reviewedAt: Date.now() } };
  const rule = existing ? await container.manageFieldDataRules.update(existing.id, ruleInput) : await container.manageFieldDataRules.create(ruleInput);
  res.json(createSuccessResponse(rule));
}));
router.post('/projects/:projectId/test-case-versions/:versionId/data-overrides', asyncHandler(async (req, res) => {
  container.testCaseVersionService.assertVersionProject(req.params.versionId, req.params.projectId);
  const input = req.body?.input;
  const overrides = typeof req.body?.overrides === 'object' ? req.body.overrides : input && typeof req.body?.value !== 'undefined'
    ? { [`${input.operationId}|${input.location}|${input.path}`]: req.body.value } : null;
  if (!overrides) { res.status(400).json({ success: false, message: 'Canonical input override is required' }); return; }
  const current = container.testCaseVersionService.getVersion(req.params.versionId);
  const next = container.testCaseVersionService.edit(req.params.versionId, { dataOverrides: { ...(current.content.dataOverrides || {}), ...overrides } });
  res.status(201).json(createSuccessResponse(next));
}));
router.post('/projects/:projectId/operations/:operationId/data-preview', asyncHandler(async (req, res) => { const operation = await container.apiOperationRepository.findById(req.params.operationId); if (!operation || operation.projectId !== req.params.projectId) { res.status(404).json({ success: false, message: 'Operation not found' }); return; } const allRules = await container.manageFieldDataRules.listByProject(req.params.projectId); const rules = allRules.filter((rule) => rule.scopeKind !== 'PROJECT_FALLBACK' && rule.input.operationId === operation.id); const required = new Set(operation.requiredRequestBodyFields || []); const inputs = Object.entries(operation.sampleRequestBody || {}).map(([path, value]) => { const rule = rules.find((item) => item.input.path === path && item.input.location === 'BODY') || null; return { input: { operationId: operation.id, serviceId: operation.serviceId, protocol: 'canonical', location: 'BODY', path, semanticType: rule?.semanticType || (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value) }, required: required.has(path), rule }; }); const overrides = typeof req.body?.overrides === 'object' ? req.body.overrides : undefined; const versionId = typeof req.body?.testCaseVersionId === 'string' ? req.body.testCaseVersionId : undefined; if (versionId) container.testCaseVersionService.assertVersionProject(versionId, req.params.projectId); const testCaseOverrides = versionId ? container.testCaseVersionService.getVersion(versionId).content.dataOverrides : undefined; const preview = await new ExecutionDataPreviewService(new FieldDataResolutionService(container.secretStore)).preview(inputs, { projectId: req.params.projectId, executionId: String(req.body?.executionId || 'preview'), suiteRunId: String(req.body?.suiteRunId || 'preview'), manualOverrides: overrides, testCaseOverrides, projectFallbackRules: allRules.filter((rule) => rule.scopeKind === 'PROJECT_FALLBACK') }); res.json(createSuccessResponse(preview)); }));
router.get('/projects/:projectId/suites/:suiteId/data-readiness', asyncHandler(async (req, res) => { const rules = await container.manageFieldDataRules.listByProject(req.params.projectId); const unresolvedRequired = rules.filter((rule) => rule.required && rule.status !== 'ACCEPTED').length; res.json(createSuccessResponse({ resolvedCount: rules.filter((rule) => rule.status === 'ACCEPTED').length, runtimeLinksReady: rules.filter((rule) => rule.valueStrategy === 'LINKED_RESPONSE' && rule.status === 'ACCEPTED').length, secretsAvailable: rules.filter((rule) => rule.valueStrategy === 'SECRET' && rule.status === 'ACCEPTED').length, optionalOmitted: rules.filter((rule) => !rule.required && rule.optionalFieldPolicy === 'OMIT').length, reviewRequired: rules.filter((rule) => rule.status === 'REVIEW_REQUIRED').length, unresolvedRequired, canExecute: unresolvedRequired === 0 })); }));
export { router as fieldDataRuleRoutes };
