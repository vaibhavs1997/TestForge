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
  const source = (operation.sourceOperation || {}) as any;
  const body = operation.sampleRequestBody || {};
  const requiredBody = new Set(operation.requiredRequestBodyFields || []);
  const inputs: CanonicalContractInput[] = [];
  const seen = new Set<string>();
  const add = (location: string, path: string, schema: any, required = false, example?: unknown) => {
    if (!path || seen.has(`${location}|${path}`)) return;
    seen.add(`${location}|${path}`);
    const value = example ?? schema?.example ?? schema?.default ?? schema?.enum?.[0];
    inputs.push({
      input: { operationId: operation.id, serviceId: operation.serviceId, protocol: 'canonical', location, path, operationLabel: `${operation.method.toUpperCase()} ${operation.path}` },
      schema: {
        type: schema?.type || (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'custom'),
        format: schema?.format,
        enum: schema?.enum,
        example: value,
        default: schema?.default,
        description: schema?.description,
      },
      required,
    });
  };

  const addNested = (location: string, path: string, schema: any, required = false, example?: unknown): void => {
    const properties = schema?.properties || (example && typeof example === 'object' && !Array.isArray(example) ? example : null);
    if (properties && typeof properties === 'object') {
      const requiredSet = new Set(schema?.required || []);
      Object.entries(properties).forEach(([key, child]) => {
        const childExample = example && typeof example === 'object' && !Array.isArray(example) ? (example as any)[key] : undefined;
        addNested(location, path ? `${path}.${key}` : key, childExample && typeof childExample === 'object' ? { ...(child as any), ...({ properties: undefined }) } : child, requiredSet.has(key), childExample);
      });
      return;
    }
    if (schema?.type === 'array' && (schema.items?.properties || Array.isArray(example))) {
      addNested(location, `${path}[]`, schema.items || {}, required, Array.isArray(example) ? example[0] : undefined);
      return;
    }
    add(location, path, schema, required, example);
  };

  Object.entries(body).forEach(([key, value]) => addNested('BODY', key, { type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value }, requiredBody.has(key), value));

  const requestBody = source.requestBody || source.raw?.requestBody;
  const media = requestBody?.content ? Object.values(requestBody.content)[0] as any : requestBody;
  const schema = media?.schema || {};
  const properties = schema.properties || {};
  Object.entries(properties).forEach(([path, fieldSchema]) => addNested('BODY', path, fieldSchema, (schema.required || []).includes(path)));

  for (const parameter of (source.parameters || [])) {
    const location = String(parameter?.in || '').toUpperCase();
    if (!['QUERY', 'PATH', 'HEADER', 'COOKIE'].includes(location)) continue;
    add(location, String(parameter.name || ''), parameter.schema || parameter, Boolean(parameter.required), parameter.example);
  }
  return inputs;
});
router.get('/projects/:projectId/field-data-rules', asyncHandler(async (req, res) => { const rules = await container.manageFieldDataRules.listByProject(req.params.projectId); const operations = await container.apiOperationRepository.findByProject(req.params.projectId); const labels = new Map(operations.map((operation) => [operation.id, `${operation.method.toUpperCase()} ${operation.path}`])); res.json(createSuccessResponse(rules.map((rule) => ({ ...rule, input: { ...rule.input, operationLabel: rule.input.operationLabel || labels.get(rule.input.operationId) || rule.input.operationId } })))); }));
router.get('/projects/:projectId/field-data-rules/:ruleId', asyncHandler(async (req, res) => { const rule = await container.fieldDataRuleRepository.findById(req.params.ruleId); if (!rule || rule.projectId !== req.params.projectId) { res.status(404).json({ success: false, message: 'Rule not found' }); return; } res.json(createSuccessResponse(rule)); }));
router.post('/projects/:projectId/field-data-rules', asyncHandler(async (req, res) => res.status(201).json(createSuccessResponse(await container.manageFieldDataRules.create({ ...req.body, projectId: req.params.projectId })))));
router.post('/projects/:projectId/field-data-rules/secure-static', asyncHandler(async (req, res) => {
  const { value, ruleId, ...ruleInput } = req.body || {};
  if (typeof value !== 'string' || !value) { res.status(400).json({ success: false, message: 'A non-empty sensitive value is required' }); return; }
  const input = ruleInput.input || {};
  const secretRef = `field-${req.params.projectId}-${input.operationId || 'manual'}-${input.location || 'BODY'}-${input.path || 'value'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const metadata = await container.secretStore.metadata(secretRef);
  if (metadata) await container.secretStore.update(secretRef, value); else await container.secretStore.set({ id: secretRef, projectId: req.params.projectId, value, classification: 'TEST_DATA' });
  const existing = ruleId ? await container.fieldDataRuleRepository.findById(ruleId) : null;
  if (ruleId && (!existing || existing.projectId !== req.params.projectId)) { res.status(404).json({ success: false, message: 'Rule not found' }); return; }
  const payload = { ...ruleInput, projectId: req.params.projectId, valueStrategy: 'SECRET', sourceReference: { type: 'secret', secretRef }, status: 'ACCEPTED' } as any;
  const rule = ruleId ? await container.manageFieldDataRules.update(ruleId, payload) : await container.manageFieldDataRules.create(payload);
  res.status(ruleId ? 200 : 201).json(createSuccessResponse({ ...rule, sourceReference: { type: 'secret', secretRef, masked: true } }));
}));
router.patch('/projects/:projectId/field-data-rules/:ruleId', asyncHandler(async (req, res) => { const existing = await container.fieldDataRuleRepository.findById(req.params.ruleId); if (!existing || existing.projectId !== req.params.projectId) { res.status(404).json({ success: false, message: 'Rule not found' }); return; } res.json(createSuccessResponse(await container.manageFieldDataRules.update(existing.id, req.body))); }));
router.post('/projects/:projectId/field-data-rules/:ruleId/accept', asyncHandler(async (req, res) => res.json(createSuccessResponse(await container.manageFieldDataRules.acceptSuggestedRule(req.params.ruleId)))));
router.post('/projects/:projectId/field-data-rules/:ruleId/review-required', asyncHandler(async (req, res) => res.json(createSuccessResponse(await container.manageFieldDataRules.markReviewRequired(req.params.ruleId)))));
router.delete('/projects/:projectId/field-data-rules', asyncHandler(async (req, res) => { const deleted = await container.fieldDataRuleRepository.deleteByProject(req.params.projectId); res.json(createSuccessResponse({ deleted })); }));
router.get('/projects/:projectId/field-data-analysis', asyncHandler(async (req, res) => { const rules = await container.manageFieldDataRules.listByProject(req.params.projectId); const summary = { totalInputs: rules.length, ready: rules.filter((r) => r.status === 'ACCEPTED' && r.valueStrategy !== 'LINKED_RESPONSE').length, existingRulesReused: rules.filter((r) => r.status === 'ACCEPTED').length, generatedSuggestions: rules.filter((r) => r.status === 'ACCEPTED' && r.valueStrategy === 'GENERATE').length, runtimeLinkSuggestions: rules.filter((r) => r.valueStrategy === 'LINKED_RESPONSE').length, optionalAutoHandled: rules.filter((r) => !r.required && r.optionalFieldPolicy === 'OMIT').length, reviewRequired: rules.filter((r) => r.status === 'REVIEW_REQUIRED' || r.status === 'SUGGESTED').length, unresolved: rules.filter((r) => r.status === 'UNRESOLVED').length }; res.json(createSuccessResponse({ summary, suggestions: rules.filter((r) => r.status !== 'ACCEPTED') })); }));
router.post('/projects/:projectId/field-data-analysis/reanalyze', asyncHandler(async (req, res) => { const projectId = req.params.projectId; const rules = await container.manageFieldDataRules.listByProject(projectId); const current = await canonicalInputs(projectId); const previous = loadSnapshot(projectId); const analysis = container.fieldDataAnalyzer.analyze(current, rules, [], previous); const reconciliation = new FieldDataRuleReconciliationService().reconcile(current, previous, rules); for (const detail of reconciliation.details.filter((item) => ['MATERIAL_CHANGE', 'BREAKING_CHANGE'].includes(item.status) && item.ruleId)) await container.manageFieldDataRules.markReviewRequired(detail.ruleId!);
  const existingKeys = new Set(rules.map((rule) => `${rule.input.operationId}|${rule.input.location}|${rule.input.path}`));
  for (const suggestion of analysis.suggestions.filter((item) => !item.reusedExistingRule)) {
    const key = `${suggestion.input.operationId}|${suggestion.input.location}|${suggestion.input.path}`;
    if (existingKeys.has(key)) continue;
    const contractInput = current.find((item) => `${item.input.operationId}|${item.input.location}|${item.input.path}` === key);
    await container.manageFieldDataRules.create({ projectId, input: suggestion.input, semanticType: suggestion.semanticType, required: contractInput?.required ?? true, valueStrategy: suggestion.strategy, changeScope: suggestion.scope, lifecycle: suggestion.lifecycle, optionalFieldPolicy: suggestion.optionalFieldPolicy, sourceReference: (suggestion.sourceReference as any) || null, status: suggestion.status === 'AUTO_ACCEPTABLE' ? 'ACCEPTED' : suggestion.status === 'UNRESOLVED' ? 'UNRESOLVED' : 'REVIEW_REQUIRED', reviewMetadata: { reason: suggestion.rationale.join(' ') } });
    existingKeys.add(key);
  }
  saveSnapshot(projectId, current); res.json(createSuccessResponse({ ...reconciliation.summary, details: reconciliation.details, suggestions: analysis.suggestions.filter((item) => !item.reusedExistingRule), analysis: analysis.summary })); }));
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
