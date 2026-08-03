// External libraries
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRoutes } from './interfaces/api/ApiRoutes';
import { environmentRoutes } from './interfaces/environment/routes';
import { datasetRoutes } from './interfaces/test-data/routes';
import { mappingRoutes } from './interfaces/test-data/mappingRoutes';
import { columnRoutes } from './interfaces/test-data/columnRoutes';
import { profileRoutes } from './interfaces/test-data/profileRoutes';
import { rowRoutes } from './interfaces/test-data/rowRoutes';
import { knowledgeRoutes } from './interfaces/knowledge/KnowledgeRoutes';
import { analysisRoutes } from './interfaces/analysis/AnalysisRoutes';
import { requirementRoutes } from './interfaces/requirements/RequirementRoutes';
import { executionRoutes } from './interfaces/execution/ExecutionRoutes';
import { executionProfileRoutes } from './interfaces/execution/executionProfileRoutes';
import { recommendationRoutes } from './interfaces/recommendation/RecommendationRoutes';
import { pipelineRoutes } from './interfaces/pipeline/PipelineRoutes';
import { testSuiteRoutes } from './interfaces/suite/TestSuiteRoutes';
import { reportRoutes } from './interfaces/report/ReportRoutes';
import { assertionRoutes } from './interfaces/assertion/AssertionRoutes';
import { importRoutes } from './interfaces/test-data/importRoutes';
import { relationshipRoutes } from './interfaces/test-data/relationshipRoutes';
import { providerRoutes } from './interfaces/providers/ProviderRoutes';
import { scheduleRoutes } from './interfaces/scheduler/ScheduleRoutes';
import { NotificationController } from './interfaces/notification/NotificationController';
import { createNotificationRoutes } from './interfaces/notification/NotificationRoutes';
import { NotificationService } from './application/notification/NotificationService';
import { InMemoryNotificationRepository } from './infrastructure/notification/NotificationRepository';
import { ProviderResolutionService } from './infrastructure/providers/ProviderResolutionService';
import ProviderRepository from './infrastructure/providers/ProviderRepository';
import { EventBus } from './domain/events/EventBus';
import { VersionController } from './interfaces/versioning/VersionController';
import { createVersionRoutes } from './interfaces/versioning/VersionRoutes';
import { VersionService } from './application/versioning/VersionService';
import { InMemoryVersionRepository } from './infrastructure/versioning/VersionRepository';
import { AuditLogController } from './interfaces/audit/AuditLogController';
import { createAuditLogRoutes } from './interfaces/audit/AuditLogRoutes';
import { AuditLogService } from './application/audit/AuditLogService';
import { InMemoryAuditLogRepository } from './infrastructure/audit/AuditLogRepository';
import { PluginController } from './interfaces/plugin/PluginController';
import { createPluginRoutes } from './interfaces/plugin/PluginRoutes';
import { PluginService } from './application/plugin/PluginService';
import { PluginRegistry } from './application/plugin/PluginRegistry';
import { PluginLoader } from './application/plugin/PluginLoader';
import { InMemoryPluginRepository } from './infrastructure/plugin/PluginRepository';
import { projectContextRoutes } from './interfaces/context/ProjectContextRoutes';
import { promptRoutes } from './interfaces/prompt/PromptRoutes';
import { aiProviderRoutes } from './interfaces/ai-provider/AIProviderRoutes';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.use('/api', environmentRoutes);
app.use('/api', datasetRoutes);
app.use('/api', mappingRoutes);
app.use('/api', columnRoutes);
app.use('/api', profileRoutes);
app.use('/api', rowRoutes);
app.use('/api', knowledgeRoutes);
app.use('/api', analysisRoutes);
app.use('/api', requirementRoutes);
app.use('/api', executionRoutes);
app.use('/api', executionProfileRoutes);
app.use('/api', recommendationRoutes);
app.use('/api', pipelineRoutes);
app.use('/api', testSuiteRoutes);
app.use('/api', reportRoutes);
app.use('/api', assertionRoutes);
app.use('/api', importRoutes);
app.use('/api', relationshipRoutes);
app.use('/api', providerRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', projectContextRoutes);
app.use('/api', promptRoutes);
app.use('/api', aiProviderRoutes);

// Initialize Plugin module (must be before Notification to allow provider resolution)
const pluginRepository = new InMemoryPluginRepository();
const pluginRegistry = new PluginRegistry(pluginRepository);
const pluginLoader = new PluginLoader(pluginRegistry);
const pluginService = new PluginService(pluginRepository, pluginRegistry);
const pluginController = new PluginController(pluginService);
app.use('/api', createPluginRoutes(pluginController));

// Load built-in plugins on startup
pluginLoader.loadBuiltInPlugins().catch(err => console.error('Failed to load plugins:', err));

// Initialize Notification module (uses Plugin Registry for provider resolution)
const notificationRepository = new InMemoryNotificationRepository();
const providerRepository = new ProviderRepository();
const providerResolutionService = new ProviderResolutionService(providerRepository, pluginRegistry);
const eventBus = new EventBus();
const notificationService = new NotificationService(notificationRepository, providerResolutionService, eventBus, pluginRegistry);
const notificationController = new NotificationController(notificationService);
app.use('/api', createNotificationRoutes(notificationController));

// Initialize Versioning module
const versionRepository = new InMemoryVersionRepository();
const versionService = new VersionService(versionRepository);
const versionController = new VersionController(versionService);
app.use('/api', createVersionRoutes(versionController));

// Initialize Audit Log module
const auditLogRepository = new InMemoryAuditLogRepository();
const auditLogService = new AuditLogService(auditLogRepository, eventBus);
const auditLogController = new AuditLogController(auditLogService);
app.use('/api', createAuditLogRoutes(auditLogController));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});