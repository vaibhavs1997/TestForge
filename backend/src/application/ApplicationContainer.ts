// ApplicationContainer - Central dependency container
// Constructs all repositories, services, and shared use cases exactly once.
// Route files consume from this container instead of constructing duplicates.
// This is an architectural refactor only - runtime behavior is unchanged.

// ─── Infrastructure repositories ─────────────────────────
import { ApiServiceRepository } from '../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../infrastructure/api/ApiOperationRepository';
import { EnvironmentRepository } from '../infrastructure/environment/EnvironmentRepository';
import { DatasetRepository } from '../infrastructure/test-data/DatasetRepository';
import { ColumnRepository } from '../infrastructure/test-data/ColumnRepository';
import { RelationshipRepository } from '../infrastructure/test-data/RelationshipRepository';
import { DatasetRowRepository } from '../infrastructure/test-data/DatasetRowRepository';
import { DataSourceMappingRepository } from '../infrastructure/test-data/DataSourceMappingRepository';
import { PopulationProfileRepository } from '../infrastructure/test-data/PopulationProfileRepository';
import { KnowledgeFlowRepository } from '../infrastructure/knowledge/KnowledgeFlowRepository';
import { BusinessRuleRepository } from '../infrastructure/knowledge/BusinessRuleRepository';
import { RuntimeVariableRepository } from '../infrastructure/knowledge/RuntimeVariableRepository';
import { DependencyRepository } from '../infrastructure/knowledge/DependencyRepository';
import { DocumentationRepository } from '../infrastructure/knowledge/DocumentationRepository';
import { AnalysisRepository } from '../infrastructure/analysis/AnalysisRepository';
import { RequirementRepository } from '../infrastructure/requirements/RequirementRepository';
import { TestStrategyRepository } from '../infrastructure/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../infrastructure/requirements/TestDesignRepository';
import { ExecutionPlanRepository } from '../infrastructure/requirements/ExecutionPlanRepository';
import { ReportRepository } from '../infrastructure/report/ReportRepository';
import { AssertionRepository } from '../infrastructure/assertion/AssertionRepository';
import { TestSuiteRepository } from '../infrastructure/suite/TestSuiteRepository';
import { ExecutionProfileRepository } from '../infrastructure/execution/ExecutionProfileRepository';
import { ExecutionRunRepository } from '../infrastructure/execution/ExecutionRunRepository';
import { ScheduleRepository } from '../infrastructure/scheduler/ScheduleRepository';
import { PipelineRepositoryImpl } from '../infrastructure/pipeline/PipelineRepository';
import { PromptRepository } from '../infrastructure/prompt/PromptRepository';
import ProviderRepository from '../infrastructure/providers/ProviderRepository';
import VersionRepository from '../infrastructure/versioning/VersionRepository';
import AuditLogRepository from '../infrastructure/audit/AuditLogRepository';
import PluginRepository from '../infrastructure/plugin/PluginRepository';
import { InMemoryAIProviderRepository } from '../infrastructure/ai-provider/AIProviderRepository';
import { InMemoryNotificationRepository } from '../infrastructure/notification/NotificationRepository';
import { InMemoryVersionRepository } from '../infrastructure/versioning/VersionRepository';
import { InMemoryAuditLogRepository } from '../infrastructure/audit/AuditLogRepository';
import { InMemoryPluginRepository } from '../infrastructure/plugin/PluginRepository';

// ─── Domain ──────────────────────────────────────────────
import { EventBus } from '../domain/events/EventBus';

// ─── Application services ────────────────────────────────
import { EventPublisher } from './EventPublisher';
import { VersionService } from './versioning/VersionService';
import { AIProviderRegistry } from './ai-provider/AIProviderRegistry';
import { AIProviderResolutionService } from './ai-provider/AIProviderResolutionService';
import { ManageAIProviders } from './ai-provider/ManageAIProviders';
import { RecommendationEngine } from './recommendation/RecommendationEngine';
import { ProjectContextService } from './context/ProjectContextService';
import { PromptBuilderService } from './prompt/PromptBuilderService';
import { PluginRegistry } from './plugin/PluginRegistry';
import { PluginLoader } from './plugin/PluginLoader';
import { PluginService } from './plugin/PluginService';
import { ProviderResolutionService } from '../infrastructure/providers/ProviderResolutionService';
import { NotificationService } from './notification/NotificationService';
import { AuditLogService } from './audit/AuditLogService';
import { ExecutePlan } from './execution/ExecutePlan';
import { SchedulerService } from './scheduler/SchedulerService';
import { OrchestratePipeline } from './pipeline/OrchestratePipeline';
import { RunAIPipeline } from './pipeline/RunAIPipeline';
import { ApiModule } from './api/ApiModule';
import { ProjectModule } from './project/ProjectModule';
import { EnvironmentModule } from './environment/EnvironmentModule';
import { ActivityStreamHub } from './realtime/ActivityStreamHub';
import { createAuditLogRepository } from '../infrastructure/persistence/createAuditLogRepository';
import { createProjectRepository } from '../infrastructure/persistence/createProjectRepository';
import type { PersistenceDriver } from '../config';

// ─── Cross-cutting subscribers (Sprint 3 integration) ───
import { CacheInvalidationService } from '../domain/events/CacheInvalidationService';
import { VersionEventListener } from './versioning/VersionEventListener';
import { RecommendationRefreshSubscriber } from './recommendation/RecommendationRefreshSubscriber';
import { PipelineRefreshSubscriber } from './pipeline/PipelineRefreshSubscriber';

// ─── AI generation use cases ─────────────────────────────
import { GenerateRequirementsWithAI } from './requirements/GenerateRequirementsWithAI';
import { GenerateTestStrategyWithAI } from './requirements/GenerateTestStrategyWithAI';
import { GenerateTestDesignWithAI } from './requirements/GenerateTestDesignWithAI';
import { GenerateAssertionsWithAI } from './assertion/GenerateAssertionsWithAI';
import { GenerateExecutionPlanWithAI } from './requirements/GenerateExecutionPlanWithAI';
import { GenerateTestSuiteWithAI } from './suite/GenerateTestSuiteWithAI';

/**
 * ApplicationContainer - constructs every repository, service, and shared
 * use case exactly once and exposes them for route wiring.
 *
 * Construction order matters:
 *   1. EventBus (no deps)
 *   2. VersionService (needs VersionRepository)
 *   3. RequirementRepository (needs VersionService + EventBus)
 *   4. All remaining repositories (no deps)
 *   5. AI Provider framework (registry → resolution → manage)
 *   6. RecommendationEngine (needs many repositories)
 *   7. ProjectContextService (needs all context repositories + recommendation)
 *   8. PromptBuilderService (needs prompt repo + context + version)
 *   9. AI generation use cases (need context + prompt + AI providers + version)
 *  10. ExecutePlan (needs execution repositories + eventBus)
 *  11. Plugin framework (registry → loader → service)
 *  12. ProviderResolutionService (needs provider repo + plugin registry)
 *  13. NotificationService (needs notification repo + provider resolution + eventBus + plugin registry)
 *  14. AuditLogService (needs audit repo + eventBus)
 *  15. SchedulerService (needs schedule repo + suite repo + executePlan + eventBus)
 *  16. Pipeline orchestrators (need repositories + AI use cases)
 */
export class ApplicationContainer {
  private readonly persistenceDriver: PersistenceDriver = (() => {
    const raw = (process.env.PERSISTENCE_DRIVER || 'json').toLowerCase();
    if (raw === 'memory' || raw === 'sqlite') return raw;
    return 'json';
  })();

  private readonly dbPath = process.env.DB_PATH || './data/testforge.db';

  readonly projectRepository = createProjectRepository(this.persistenceDriver, this.dbPath);

  // ─── EventBus ──────────────────────────────────────────
  readonly eventBus = new EventBus();
  readonly eventPublisher = new EventPublisher(this.eventBus);

  // ─── Repositories ──────────────────────────────────────
  readonly apiServiceRepository = new ApiServiceRepository();
  readonly apiOperationRepository = new ApiOperationRepository();
  readonly environmentRepository = new EnvironmentRepository();
  readonly datasetRepository = new DatasetRepository();
  readonly columnRepository = new ColumnRepository();
  readonly relationshipRepository = new RelationshipRepository();
  readonly datasetRowRepository = new DatasetRowRepository();
  readonly dataSourceMappingRepository = new DataSourceMappingRepository();
  readonly populationProfileRepository = new PopulationProfileRepository();
  readonly knowledgeFlowRepository = new KnowledgeFlowRepository();
  readonly businessRuleRepository = new BusinessRuleRepository();
  readonly runtimeVariableRepository = new RuntimeVariableRepository();
  readonly dependencyRepository = new DependencyRepository();
  readonly documentationRepository = new DocumentationRepository();
  readonly analysisRepository = new AnalysisRepository();
  readonly testStrategyRepository = new TestStrategyRepository(this.eventPublisher);
  readonly testDesignRepository = new TestDesignRepository(this.eventPublisher);
  readonly executionPlanRepository = new ExecutionPlanRepository(this.eventPublisher);
  readonly reportRepository = new ReportRepository();
  readonly assertionRepository = new AssertionRepository(this.eventPublisher);
  readonly testSuiteRepository = new TestSuiteRepository();
  readonly executionProfileRepository = new ExecutionProfileRepository();
  readonly executionRunRepository = new ExecutionRunRepository();
  readonly scheduleRepository = new ScheduleRepository();
  readonly pipelineRepository = new PipelineRepositoryImpl();
  readonly promptRepository = new PromptRepository();
  readonly providerRepository = new ProviderRepository();
  readonly versionRepository = new VersionRepository();
  readonly auditLogRepository = createAuditLogRepository(this.persistenceDriver);
  readonly pluginRepository = new PluginRepository();
  readonly aiProviderRepository = new InMemoryAIProviderRepository();
  readonly notificationRepository = new InMemoryNotificationRepository();
  readonly inMemoryVersionRepository = new InMemoryVersionRepository();
  readonly inMemoryAuditLogRepository = new InMemoryAuditLogRepository();
  readonly inMemoryPluginRepository = new InMemoryPluginRepository();

  // ─── VersionService ────────────────────────────────────
  readonly versionService = new VersionService(this.inMemoryVersionRepository);

  // ─── RequirementRepository (wired with central EventPublisher) ──
  // Versioning + audit + cache invalidation are handled by cross-cutting
  // subscribers listening on the EventBus (Sprint 3 integration).
  readonly requirementRepository = new RequirementRepository(
    this.eventPublisher
  );

  // ─── AI Provider framework ─────────────────────────────
  readonly aiProviderRegistry = new AIProviderRegistry();
  readonly aiProviderResolutionService = new AIProviderResolutionService(this.aiProviderRegistry);
  readonly manageAIProviders = new ManageAIProviders(
    this.aiProviderRepository,
    this.aiProviderRegistry,
    this.aiProviderResolutionService
  );

  // ─── RecommendationEngine ──────────────────────────────
  readonly recommendationEngine = new RecommendationEngine(
    this.requirementRepository,
    this.testStrategyRepository,
    this.testDesignRepository,
    this.executionPlanRepository,
    this.executionRunRepository,
    this.knowledgeFlowRepository,
    this.datasetRepository,
    this.environmentRepository,
    this.apiOperationRepository
  );

  // ─── ProjectContextService ─────────────────────────────
  readonly projectContextService = new ProjectContextService(
    this.apiServiceRepository,
    this.apiOperationRepository,
    this.environmentRepository,
    this.datasetRepository,
    this.columnRepository,
    this.relationshipRepository,
    this.knowledgeFlowRepository,
    this.businessRuleRepository,
    this.runtimeVariableRepository,
    this.dependencyRepository,
    this.documentationRepository,
    this.analysisRepository,
    this.requirementRepository,
    this.reportRepository,
    this.testStrategyRepository,
    this.testDesignRepository,
    this.executionPlanRepository,
    this.assertionRepository,
    this.testSuiteRepository,
    this.executionProfileRepository,
    this.providerRepository,
    this.versionRepository,
    this.auditLogRepository,
    this.pluginRepository,
    this.recommendationEngine
  );

  // ─── PromptBuilderService ──────────────────────────────
  readonly promptBuilderService = new PromptBuilderService(
    this.promptRepository,
    this.projectContextService,
    this.versionService
  );

  // ─── AI generation use cases ───────────────────────────
  readonly generateRequirementsWithAI = new GenerateRequirementsWithAI(
    this.requirementRepository,
    this.projectContextService,
    this.promptBuilderService,
    this.manageAIProviders,
    this.versionService,
    this.eventPublisher
  );
  readonly generateTestStrategyWithAI = new GenerateTestStrategyWithAI(
    this.requirementRepository,
    this.testStrategyRepository,
    this.projectContextService,
    this.promptBuilderService,
    this.manageAIProviders,
    this.versionService,
    this.eventPublisher
  );
  readonly generateTestDesignWithAI = new GenerateTestDesignWithAI(
    this.requirementRepository,
    this.testStrategyRepository,
    this.testDesignRepository,
    this.projectContextService,
    this.promptBuilderService,
    this.manageAIProviders,
    this.versionService,
    this.eventPublisher
  );
  readonly generateAssertionsWithAI = new GenerateAssertionsWithAI(
    this.assertionRepository,
    this.testDesignRepository,
    this.projectContextService,
    this.promptBuilderService,
    this.manageAIProviders,
    this.versionService,
    this.eventPublisher
  );
  readonly generateExecutionPlanWithAI = new GenerateExecutionPlanWithAI(
    this.requirementRepository,
    this.testStrategyRepository,
    this.testDesignRepository,
    this.executionPlanRepository,
    this.projectContextService,
    this.promptBuilderService,
    this.manageAIProviders,
    this.versionService,
    this.eventPublisher
  );
  readonly generateTestSuiteWithAI = new GenerateTestSuiteWithAI(
    this.executionPlanRepository,
    this.testSuiteRepository,
    this.projectContextService,
    this.promptBuilderService,
    this.manageAIProviders,
    this.versionService,
    this.eventPublisher
  );

  // ─── ExecutePlan (Execution Engine) ────────────────────
  readonly executePlan = new ExecutePlan(
    this.executionRunRepository,
    this.executionPlanRepository,
    this.requirementRepository,
    this.environmentRepository,
    this.datasetRepository,
    this.apiOperationRepository,
    this.dataSourceMappingRepository,
    this.datasetRowRepository,
    this.testDesignRepository,
    this.assertionRepository,
    this.executionProfileRepository,
    this.eventPublisher
  );

  // ─── Plugin framework ──────────────────────────────────
  readonly pluginRegistry = new PluginRegistry(this.inMemoryPluginRepository);
  readonly pluginLoader = new PluginLoader(this.pluginRegistry);
  readonly pluginService = new PluginService(this.inMemoryPluginRepository, this.pluginRegistry, this.eventPublisher);

  // ─── ProviderResolutionService ─────────────────────────
  readonly providerResolutionService = new ProviderResolutionService(
    this.providerRepository,
    this.pluginRegistry
  );

  // ─── NotificationService ───────────────────────────────
  readonly notificationService = new NotificationService(
    this.notificationRepository,
    this.providerResolutionService,
    this.eventBus,
    this.pluginRegistry
  );

  // ─── AuditLogService ───────────────────────────────────
  readonly auditLogService = new AuditLogService(
    this.auditLogRepository,
    this.eventBus
  );

  // ─── SchedulerService ──────────────────────────────────
  readonly schedulerService = new SchedulerService(
    this.scheduleRepository,
    this.testSuiteRepository,
    this.executePlan,
    this.eventPublisher
  );

  // ─── Pipeline orchestrators ────────────────────────────
  readonly orchestratePipeline = new OrchestratePipeline(
    this.pipelineRepository,
    this.requirementRepository,
    this.analysisRepository,
    this.knowledgeFlowRepository,
    this.datasetRepository,
    this.environmentRepository,
    this.apiServiceRepository,
    this.apiOperationRepository,
    this.testStrategyRepository,
    this.testDesignRepository,
    this.executionPlanRepository
  );
  readonly runAIPipeline = new RunAIPipeline(
    this.requirementRepository,
    this.generateRequirementsWithAI,
    this.generateTestStrategyWithAI,
    this.generateTestDesignWithAI,
    this.generateAssertionsWithAI,
    this.generateExecutionPlanWithAI,
    this.generateTestSuiteWithAI
  );

  // ─── Cross-cutting subscribers (Sprint 3 integration) ───
  // Wired AFTER all services so they subscribe before any event is published.
  // Chain: EventBus → AuditLogService → VersionEventListener →
  //        CacheInvalidationService → NotificationService →
  //        RecommendationRefreshSubscriber → PipelineRefreshSubscriber
  readonly cacheInvalidationService = new CacheInvalidationService(this.eventBus);
  readonly versionEventListener = new VersionEventListener(this.eventBus, this.versionService);
  readonly recommendationRefreshSubscriber = new RecommendationRefreshSubscriber(this.eventBus, this.recommendationEngine);
  readonly pipelineRefreshSubscriber = new PipelineRefreshSubscriber(this.eventBus, this.orchestratePipeline);

  // ─── HTTP modules (Phase 4 composition) ─────────────────
  readonly apiModule = new ApiModule({
    apiServiceRepository: this.apiServiceRepository,
    apiOperationRepository: this.apiOperationRepository,
    eventPublisher: this.eventPublisher,
  });
  readonly projectModule = new ProjectModule(this.projectRepository);
  readonly environmentModule = new EnvironmentModule({
    environmentRepository: this.environmentRepository,
    eventPublisher: this.eventPublisher,
  });
  readonly activityStreamHub = new ActivityStreamHub(this.eventBus);
}

// Singleton instance shared across the application
export const container = new ApplicationContainer();

export default container;