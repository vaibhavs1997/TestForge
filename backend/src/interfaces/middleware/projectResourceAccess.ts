import type { Request } from 'express';
import type { ApplicationContainer } from '../../application/ApplicationContainer.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';

type Resource = { projectId?: string; datasetId?: string; requirementId?: string };
type Resolver = (id: string) => Promise<Resource | null>;

/** Validate control-plane references before a controller reads or mutates them. */
export function createProjectResourceAuthorizer(c: ApplicationContainer) {
  const repository = (repo: { findById(id: string): Promise<any> }): Resolver => id => repo.findById(id);
  const resolvers: Record<string, Resolver> = {
    requirementId: repository(c.requirementRepository), testDesignId: repository(c.testDesignRepository),
    prerequisiteDesignId: async id => await c.testDesignRepository.findById(id) || await c.executionPlanRepository.findById(id), testStrategyId: repository(c.testStrategyRepository),
    executionPlanId: repository(c.executionPlanRepository), executionRunId: repository(c.executionRunRepository),
    runId: repository(c.executionRunRepository), reportId: repository(c.reportRepository),
    environmentId: repository(c.environmentRepository), envId: repository(c.environmentRepository),
    defaultEnvironmentId: repository(c.environmentRepository), executionProfileId: repository(c.executionProfileRepository),
    datasetId: repository(c.datasetRepository), sourceDatasetId: repository(c.datasetRepository), targetDatasetId: repository(c.datasetRepository),
    columnId: repository(c.columnRepository), sourceColumnId: repository(c.columnRepository), targetColumnId: repository(c.columnRepository),
    rowId: repository(c.datasetRowRepository), mappingId: repository(c.dataSourceMappingRepository),
    relationshipId: repository(c.relationshipRepository), operationId: repository(c.apiOperationRepository),
    apiId: repository(c.apiOperationRepository), sourceOperationId: repository(c.apiOperationRepository), targetOperationId: repository(c.apiOperationRepository),
    serviceId: repository(c.apiServiceRepository), suiteId: repository(c.testSuiteRepository),
    assertionId: repository(c.assertionRepository), flowId: repository(c.knowledgeFlowRepository),
    variableId: repository(c.runtimeVariableRepository), dependencyId: repository(c.dependencyRepository),
    docId: repository(c.documentationRepository), analysisId: repository(c.analysisRepository),
    scheduleId: repository(c.scheduleRepository), pipelineId: repository(c.pipelineRepository),
    promptId: repository(c.promptRepository),
    secretRef: id => c.secretStore.metadata(id),
    testCaseVersionId: async id => ({ requirementId: c.testCaseVersionService.getVersion(id).content.requirementId }),
  };
  const containers = new Set(['input', 'sourceReference', 'mapping', 'executionPlans', 'dependencies', 'assertions', 'assertionReferences', 'dataSources', 'configuration', 'executionPolicy', 'operationMappings', 'steps']);
  return async (req: Request): Promise<void> => {
    const projectId = req.params.projectId;
    if (!projectId || !req.route) return;
    const routeResolvers: Record<string, Resolver> = { ...resolvers,
      providerId: repository(req.originalUrl.includes('/providers') && !req.originalUrl.includes('/ai/') ? c.providerRepository : c.aiProviderRepository),
      profileId: repository(req.originalUrl.includes('/test-data/') ? c.populationProfileRepository : c.executionProfileRepository),
      ruleId: repository(req.originalUrl.includes('/field-data-rules') ? c.fieldDataRuleRepository : c.businessRuleRepository),
      versionId: req.originalUrl.includes('/test-case-versions') ? resolvers.testCaseVersionId : repository(c.versionRepository),
    };
    const seen = new Set<string>();
    const check = async (key: string, value: unknown): Promise<void> => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'projectId') {
        if (value !== projectId) throw new ForbiddenError('Resource belongs to another project');
        return;
      }
      if (Array.isArray(value) && key.endsWith('Ids')) {
        for (const id of value) await check(key.slice(0, -1), id);
        return;
      }
      const resolve = routeResolvers[key];
      if (!resolve) return;
      if (typeof value !== 'string') throw new ForbiddenError('Invalid resource reference');
      const cacheKey = key + ':' + value;
      if (seen.has(cacheKey)) return;
      seen.add(cacheKey);
      const resource = await resolve(value);
      if (!resource) throw new NotFoundError('Resource not found in this project');
      if (resource.projectId) {
        if (resource.projectId !== projectId) throw new NotFoundError('Resource not found in this project');
      } else if (resource.datasetId) await check('datasetId', resource.datasetId);
      else if (resource.requirementId) await check('requirementId', resource.requirementId);
      else throw new ForbiddenError('Resource has no verifiable project ownership');
    };
    const inspect = async (value: unknown, depth = 0): Promise<void> => {
      if (depth > 12) throw new ForbiddenError('Resource references are too deeply nested');
      if (Array.isArray(value)) { for (const item of value) await inspect(item, depth + 1); return; }
      if (!value || typeof value !== 'object') return;
      const control = value as Record<string, any>;
      if (control.sourceReference?.id) {
        if (control.valueStrategy === 'SECRET') await check('secretRef', control.sourceReference.id);
        if (control.valueStrategy === 'DATASET') await check('datasetId', control.sourceReference.id);
      }
      for (const [key, child] of Object.entries(value)) {
        await check(key, child);
        if (containers.has(key)) await inspect(child, depth + 1);
      }
    };
    if (req.params.id && req.originalUrl.includes('/assertions/')) await check('assertionId', req.params.id);
    await inspect(req.params);
    await inspect(req.query);
    await inspect(req.body);
  };
}
