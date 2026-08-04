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
import { createNotificationRoutes } from './interfaces/notification/NotificationRoutes';
import { createVersionRoutes } from './interfaces/versioning/VersionRoutes';
import { createAuditLogRoutes } from './interfaces/audit/AuditLogRoutes';
import { createPluginRoutes } from './interfaces/plugin/PluginRoutes';
import { projectContextRoutes } from './interfaces/context/ProjectContextRoutes';
import { promptRoutes } from './interfaces/prompt/PromptRoutes';
import { aiProviderRoutes } from './interfaces/ai-provider/AIProviderRoutes';
import { container } from './application/ApplicationContainer';
import { PluginController } from './interfaces/plugin/PluginController';
import { NotificationController } from './interfaces/notification/NotificationController';
import { VersionController } from './interfaces/versioning/VersionController';
import { AuditLogController } from './interfaces/audit/AuditLogController';

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
const pluginController = new PluginController(container.pluginService);
app.use('/api', createPluginRoutes(pluginController));

// Load built-in plugins on startup
container.pluginLoader.loadBuiltInPlugins().catch(err => console.error('Failed to load plugins:', err));

// Initialize Notification module (uses Plugin Registry for provider resolution)
const notificationController = new NotificationController(container.notificationService);
app.use('/api', createNotificationRoutes(notificationController));

// Initialize Versioning module
const versionController = new VersionController(container.versionService);
app.use('/api', createVersionRoutes(versionController));

// Initialize Audit Log module
const auditLogController = new AuditLogController(container.auditLogService);
app.use('/api', createAuditLogRoutes(auditLogController));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});