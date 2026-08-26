// ApplicationContainer - Central dependency container
// Constructs all repositories, services, and shared use cases exactly once.
// Route files consume from this container instead of constructing duplicates.
// This is an architectural refactor only - runtime behavior is unchanged.

// ─── Infrastructure repositories ─────────────────────────
import { ApiServiceRepository } from '../infrastructure/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../infrastructure/api/ApiOperationRepository.js';
import { EnvironmentRepository } from '../infrastructure/environment/EnvironmentRepository.js';
import { DatasetRepository } from '../infrastructure/test-data/DatasetRepository.js';
import { ColumnRepository } from '../infrastructure/test-data/ColumnRepository.js';
import { RelationshipRepository } from '../infrastructure/test-data/RelationshipRepository.js';
import { DatasetRowRepository } from '../infrastructure/test-data/DatasetRowRepository.js';
import { DataSourceMappingRepository } from '../infrastructure/test-data/DataSourceMappingRepository.js';
import { FieldDataRuleRepository } from '../infrastructure/test-data/FieldDataRuleRepository.js';
import { ManageFieldDataRules } from './test-data/ManageFieldDataRules.js';
import { FieldDataAnalyzer } from './test-data/FieldDataAnalyzer.js';
import { TestDataResolutionService } from './test-data/TestDataResolutionService.js';
import { PopulationProfileRepository } from '../infrastructure/test-data/PopulationProfileRepository.js';
import { KnowledgeFlowRepository } from '../infrastructure/knowledge/KnowledgeFlowRepository.js';
import { BusinessRuleRepository } from '../infrastructure/knowledge/BusinessRuleRepository.js';
import { RuntimeVariableRepository } from '../infrastructure/knowledge/RuntimeVariableRepository.js';
import { DependencyRepository } from '../infrastructure/knowledge/DependencyRepository.js';
import { DocumentationRepository } from '../infrastructure/knowledge/DocumentationRepository.js';
import { AnalysisRepository } from '../infrastructure/analysis/AnalysisRepository.js';
import { RequirementRepository } from '../infrastructure/requirements/RequirementRepository.js';
import { TestStrategyRepository } from '../infrastructure/requirements/TestStrategyRepository.js';
import { TestDesignRepository } from '../infrastructure/requirements/TestDesignRepository.js';
import { ExecutionPlanRepository } from '../infrastructure/requirements/ExecutionPlanRepository.js';
import { ReportRepository } from '../infrastructure/report/ReportRepository.js';
import { AssertionRepository } from '../infrastructure/assertion/AssertionRepository.js';
import { TestSuiteRepository } from '../infrastructure/suite/TestSuiteRepository.js';
import { ExecutionProfileRepository } from '../infrastructure/execution/ExecutionProfileRepository.js';
import { ExecutionRunRepository } from '../infrastructure/execution/ExecutionRunRepository.js';
import { ScheduleRepository } from '../infrastructure/scheduler/ScheduleRepository.js';
import { PipelineRepositoryImpl } from '../infrastructure/pipeline/PipelineRepository.js';
import { PromptRepository } from '../infrastructure/prompt/PromptRepository.js';
import ProviderRepository from '../infrastructure/providers/ProviderRepository.js';
import VersionRepository from '../infrastructure/versioning/VersionRepository.js';
import AuditLogRepository from '../infrastructure/audit/AuditLogRepository.js';
import PluginRepository from '../infrastructure/plugin/PluginRepository.js';
import { FileAIProviderRepository } from '../infrastructure/ai-provider/AIProviderRepository.js';
import { InMemoryNotificationRepository } from '../infrastructure/notification/NotificationRepository.js';
import { InMemoryVersionRepository } from '../infrastructure/versioning/VersionRepository.js';
import { InMemoryAuditLogRepository } from '../infrastructure/audit/AuditLogRepository.js';
import { InMemoryPluginRepository } from '../infrastructure/plugin/PluginRepository.js';
import { LocalSecretStore } from '../infrastructure/security/LocalSecretStore.js';

// ─── Domain ──────────────────────────────────────────────
import { EventBus } from '../domain/events/EventBus.js';

// ─── Application services ────────────────────────────────
import { EventPublisher } from './EventPublisher.js';
import { VersionService } from './versioning/VersionService.js';
import { AIProviderRegistry } from './ai-provider/AIProviderRegistry.js';
import { AIProviderResolutionService } from './ai-provider/AIProviderResolutionService.js';
import { ManageAIProviders } from './ai-provider/ManageAIProviders.js';
import { RecommendationEngine } from './recommendation/RecommendationEngine.js';
import { ProjectContextService } from './context/ProjectContextService.js';
import { PromptBuilderService } from './prompt/PromptBuilderService.js';
import { PluginRegistry } from './plugin/PluginRegistry.js';
import { PluginLoader } from './plugin/PluginLoader.js';
import { PluginService } from './plugin/PluginService.js';
import { ProviderResolutionService } from '../infrastructure/providers/ProviderResolutionService.js';
import { NotificationService } from './notification/NotificationService.js';
import { AuditLogService } from './audit/AuditLogService.js';
import { ExecutePlan } from './execution/ExecutePlan.js';
import { ExecuteSuite } from './suite/ExecuteSuite.js';
import { SchedulerService } from './scheduler/SchedulerService.js';
import { JsonDurableJobRepository } from '../infrastructure/jobs/JsonDurableJobRepository.js';
import { JsonDistributedLeaseRepository } from '../infrastructure/jobs/JsonDistributedLeaseRepository.js';
import { DurableJobWorker } from './jobs/DurableJobWorker.js';
import { OrchestratePipeline } from './pipeline/OrchestratePipeline.js';
import { RunAIPipeline } from './pipeline/RunAIPipeline.js';
import { ApiModule } from './api/ApiModule.js';
import { ProjectModule } from './project/ProjectModule.js';
import { EnvironmentModule } from './environment/EnvironmentModule.js';
import { ActivityStreamHub } from './realtime/ActivityStreamHub.js';
import { AuthService } from './auth/AuthService.js';
import { createAuditLogRepository } from '../infrastructure/persistence/createAuditLogRepository.js';
import { createProjectRepository } from '../infrastructure/persistence/createProjectRepository.js';
import type { PersistenceDriver } from '../config.js';

// ─── Cross-cutting subscribers (Sprint 3 integration) ───
import { CacheInvalidationService } from '../domain/events/CacheInvalidationService.js';
import { VersionEventListener } from './versioning/VersionEventListener.js';
import { RecommendationRefreshSubscriber } from './recommendation/RecommendationRefreshSubscriber.js';
import { PipelineRefreshSubscriber } from './pipeline/PipelineRefreshSubscriber.js';

// ─── AI generation use cases ─────────────────────────────
import { GenerateRequirementsWithAI } from './requirements/GenerateRequirementsWithAI.js';
import { GenerateTestStrategyWithAI } from './requirements/GenerateTestStrategyWithAI.js';
import { GenerateTestDesignWithAI } from './requirements/GenerateTestDesignWithAI.js';
import { GenerationProvenanceService } from './requirements/GenerationProvenanceService.js';
import { GenerateAssertionsWithAI } from './assertion/GenerateAssertionsWithAI.js';
import { GenerateExecutionPlanWithAI } from './requirements/GenerateExecutionPlanWithAI.js';
import { GenerateTestSuiteWithAI } from './suite/GenerateTestSuiteWithAI.js';
import { TestCaseVersionService } from './requirements/TestCaseVersionService.js';

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
  readonly testCaseVersionService = new TestCaseVersionService();
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
  readonly fieldDataRuleRepository = new FieldDataRuleRepository();
  readonly manageFieldDataRules = new ManageFieldDataRules(this.fieldDataRuleRepository);
  readonly fieldDataAnalyzer = new FieldDataAnalyzer();
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
  readonly durableJobRepository = new JsonDurableJobRepository();
  readonly schedulerLeaseRepository = new JsonDistributedLeaseRepository();
  readonly secretStore = new LocalSecretStore();
  readonly testDataResolutionService = new TestDataResolutionService(
    this.dataSourceMappingRepository,
    this.datasetRowRepository,
    this.datasetRepository,
    this.columnRepository,
    this.runtimeVariableRepository,
    this.environmentRepository,
    this.fieldDataRuleRepository,
    this.secretStore,
  );
  readonly pipelineRepository = new PipelineRepositoryImpl();
  readonly promptRepository = new PromptRepository();
  readonly providerRepository = new ProviderRepository();
  readonly versionRepository = new VersionRepository();
  readonly auditLogRepository = createAuditLogRepository(this.persistenceDriver);
  readonly pluginRepository = new PluginRepository();
  readonly aiProviderRepository = new FileAIProviderRepository();
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
  readonly generationProvenanceService = new GenerationProvenanceService(
    this.apiOperationRepository,
    this.fieldDataRuleRepository,
    this.testDesignRepository,
    this.testCaseVersionService,
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
    this.eventPublisher,
    this.generationProvenanceService
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
    this.columnRepository,
    this.runtimeVariableRepository,
    this.testDesignRepository,
    this.assertionRepository,
    this.executionProfileRepository,
    this.eventPublisher,
    this.apiServiceRepository,
    undefined,
    this.secretStore,
    this.fieldDataRuleRepository,
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
  readonly executeSuite = new ExecuteSuite(
    this.testSuiteRepository,
    this.executePlan,
    this.executionPlanRepository,
  );

  readonly schedulerService = new SchedulerService(
    this.scheduleRepository,
    this.durableJobRepository,
    this.schedulerLeaseRepository,
    this.eventPublisher
  );
  readonly durableJobWorker = new DurableJobWorker(this.durableJobRepository, this.executeSuite);

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
    this.executionPlanRepository,
    this.generationProvenanceService
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
  readonly pipelineRefreshSubscriber = new PipelineRefreshSubscriber(this.eventBus);

  // ─── HTTP modules (Phase 4 composition) ─────────────────
  readonly apiModule = new ApiModule({
    apiServiceRepository: this.apiServiceRepository,
    apiOperationRepository: this.apiOperationRepository,
    eventPublisher: this.eventPublisher,
    fieldDataRuleRepository: this.fieldDataRuleRepository,
    testDataResolutionService: this.testDataResolutionService,
    impactRepositories: [
      { findByProject: (projectId: string) => this.requirementRepository.findByProject(projectId), impactKind: 'requirementMappings' },
      { findByProject: (projectId: string) => this.testDesignRepository.findByProject(projectId), impactKind: 'testCases' },
      { findByProject: (projectId: string) => this.executionPlanRepository.findByProject(projectId), impactKind: 'testCaseVersions' },
      { findByProject: (projectId: string) => this.testSuiteRepository.findByProject(projectId), impactKind: 'suites' },
      { findByProject: (projectId: string) => this.scheduleRepository.findByProject(projectId), impactKind: 'schedules' },
      { findByProject: (projectId: string) => this.runtimeVariableRepository.findByProject(projectId), impactKind: 'runtimeLinks' },
    ],
  });
  readonly projectModule = new ProjectModule(this.projectRepository, this.auditLogService);
  readonly environmentModule = new EnvironmentModule({
    environmentRepository: this.environmentRepository,
    eventPublisher: this.eventPublisher,
    secretStore: this.secretStore,
  });
  readonly activityStreamHub = new ActivityStreamHub(this.eventBus);
  readonly authService = new AuthService();
}

// Singleton instance shared across the application
export const container = new ApplicationContainer();

export default container;
