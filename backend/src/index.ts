// External libraries
import express from 'express';
import cors from 'cors';
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
import { integrationRoutes } from './interfaces/integrations/IntegrationRoutes';
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
import { validateConfig } from './config';
import { BackupService } from './interfaces/backup/BackupService';
import { createBackupRoutes } from './interfaces/backup/BackupRoutes';
import { errorHandler, notFoundHandler } from './interfaces/middleware/ErrorHandler';
import { authenticate, authorizeProject, setProjectAccessLookup } from './interfaces/middleware/auth';
import { asyncHandler } from './interfaces/middleware/AsyncHandler';
import { createSuccessResponse } from './shared/ApiResponse';
import { projectRoutes } from './interfaces/project/ProjectRoutes';
import { createActivityStreamRoutes } from './interfaces/realtime/ActivityStreamRoutes';
import { createAuthRoutes } from './interfaces/auth/AuthRoutes';
import { connectMongo, disconnectMongo } from './infrastructure/auth/mongoClient';
import { loadEnv } from './config/loadEnv';
import { logger } from './infrastructure/logging/Logger';
import { createRateLimiter } from './infrastructure/security/rateLimiter';
import { sanitizeRequestBody, sanitizeQuery } from './infrastructure/security/sanitize';
import { metrics } from './infrastructure/metrics/Metrics';
import { createWebhookRoutes } from './interfaces/webhook/WebhookRoutes';
import { ListWebhooks, GetWebhook, CreateWebhook, UpdateWebhook, DeleteWebhook, TriggerWebhooks } from './application/webhook/WebhookUseCases';
import type { WebhookRepository } from './domain/webhook/WebhookRepository';
import type { WebhookEntity } from './domain/webhook/WebhookEntity';

loadEnv();

async function bootstrap(): Promise<void> {
  let config;
  try {
    config = validateConfig();
  } catch (err) {
    logger.error('Configuration validation failed', { error: err instanceof Error ? err.message : err });
    process.exit(1);
  }

  const app = express();
  const port = config.port;

  const connectMongoPromise =
    config.mongodbUri
      ? connectMongo(config.mongodbUri)
          .then(() => {
            logger.info('Connected to MongoDB (enterprise user accounts enabled)');
          })
          .catch((err) => {
            logger.error('MongoDB connection failed — login/register will not work until this is fixed', {
              error: err instanceof Error ? err.message : err,
              hint: 'Check Atlas Network Access (your IP), database user password (URL-encode @ as %40), and cluster hostname.',
            });
          })
      : Promise.resolve();

  void connectMongoPromise;

  const corsOrigins = config.corsOrigin.split(',').map((origin) => origin.trim());
  app.use(cors({ origin: corsOrigins }));
  
  // Rate limiting (skip in development for easier testing)
  if (config.nodeEnv !== 'development') {
    app.use('/api', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }));
  }
  
  app.use(express.json());
  
  // Input sanitization
  app.use(sanitizeRequestBody);
  app.use(sanitizeQuery);
  
  // Metrics tracking middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      metrics.increment('requests_total', { method: req.method, path: req.path, status: String(res.statusCode) });
      metrics.observe('request_duration_seconds', duration, {});
    });
    next();
  });

  app.use('/api', createAuthRoutes(container.authService));

  app.use('/api', authenticate);
  setProjectAccessLookup(async (projectId) => {
    const p = await container.projectModule.repository.findById(projectId);
    return p ? { ownerId: p.ownerId, tenantId: p.tenantId } : null;
  });
  app.use('/api/projects/:projectId', asyncHandler(authorizeProject));

  app.get(
    '/api/me',
    asyncHandler(async (req, res) => {
      const authConfig = config.auth;
      if (!authConfig.enabled) {
        res.status(200).json(
          createSuccessResponse({
            authenticated: false,
            subject: 'local-dev',
            projectIds: '*',
            loginRequired: false,
          }),
        );
        return;
      }
      if (!req.auth) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      let displayName = req.auth.email ?? req.auth.subject;
      let email = req.auth.email;
      if (config.mongodbUri && req.auth.subject !== 'api-key') {
        const profile = await container.authService.getPublicProfile(req.auth.subject);
        if (profile) {
          displayName = profile.displayName;
          email = profile.email;
        }
      }

      res.status(200).json(
        createSuccessResponse({
          authenticated: true,
          subject: req.auth.subject,
          email,
          displayName,
          tenantId: req.auth.tenantId,
          role: req.auth.role,
          projectIds: req.auth.projectIds,
          loginRequired: authConfig.enterpriseLogin,
        }),
      );
    }),
  );

  container.activityStreamHub.start();
  app.use('/api', createActivityStreamRoutes(container.activityStreamHub));
  app.use('/api', projectRoutes);

  const serverStartTime = Date.now();

  // ── Health Endpoints ─────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: Math.round((Date.now() - serverStartTime) / 1000),
      version: config.version,
      build: config.buildTimestamp,
      gitCommit: config.gitCommit,
    });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({
      status: 'ready',
      uptime: Math.round((Date.now() - serverStartTime) / 1000),
      version: config.version,
      build: config.buildTimestamp,
    });
  });

  // ── Metrics Endpoint ───────────────────────────────────────────────────
  app.get('/metrics', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics.getMetrics());
  });

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
  app.use('/api', integrationRoutes);
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
  container.pluginLoader.loadBuiltInPlugins().catch((err) => 
    logger.error('Failed to load plugins', { error: err instanceof Error ? err.message : err })
  );

  // Initialize Notification module (uses Plugin Registry for provider resolution)
  const notificationController = new NotificationController(container.notificationService);
  app.use('/api', createNotificationRoutes(notificationController));

  // Initialize Versioning module
  const versionController = new VersionController(container.versionService);
  app.use('/api', createVersionRoutes(versionController));

  // Initialize Audit Log module
  const auditLogController = new AuditLogController(container.auditLogService);
  app.use('/api', createAuditLogRoutes(auditLogController));

  // Initialize Backup & Restore module
  const backupService = new BackupService();
  app.use('/api', createBackupRoutes(backupService));

  // Initialize Webhook module
  const webhookRepository: WebhookRepository = {
    list: async () => [],
    findById: async () => null,
    findByProject: async () => [],
    create: async (webhook) => ({ ...webhook, createdAt: Date.now(), updatedAt: Date.now() } as WebhookEntity),
    update: async (id, data) => ({ id, ...data, updatedAt: Date.now() } as WebhookEntity),
    delete: async () => undefined,
  };
  const webhookUseCases = {
    list: new ListWebhooks(webhookRepository),
    get: new GetWebhook(webhookRepository),
    create: new CreateWebhook(webhookRepository),
    update: new UpdateWebhook(webhookRepository),
    delete: new DeleteWebhook(webhookRepository),
    trigger: new TriggerWebhooks(webhookRepository),
  };
  app.use('/api', createWebhookRoutes(
    webhookUseCases.list,
    webhookUseCases.get,
    webhookUseCases.create,
    webhookUseCases.update,
    webhookUseCases.delete,
  ));

  // ── 404 Not Found Handler ───────────────────────────────────────────────────
  // Must be before error handler middleware
  app.use(notFoundHandler);

  // ── Error Handler Middleware ────────────────────────────────────────────────
  // Must be registered LAST, after all routes and middleware
  app.use(errorHandler);

  const server = app.listen(port, () => {
    logger.info(`Server running on port ${port} (${config.nodeEnv})`, {
      version: config.version,
      buildTimestamp: config.buildTimestamp,
      gitCommit: config.gitCommit,
    });
    
    // Development mode warning
    if (config.nodeEnv === 'development' && !config.auth.enabled) {
      logger.warn('⚠️  Running in development mode WITHOUT authentication');
      logger.warn('   This is OK for local development, but remember to enable auth before deploying to production:');
      logger.warn('   - Set TESTFORGE_API_KEY for API key authentication');
      logger.warn('   - Set TESTFORGE_JWT_SECRET for JWT authentication');
      logger.warn('   See DEPLOYMENT.md for details');
    }
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.warn(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      container.activityStreamHub.stop();
      await disconnectMongo();
      logger.info('HTTP server closed.');
      process.exit(0);
    });

    // Force exit after 10s if connections hang
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err instanceof Error ? err.message : err });
  process.exit(1);
});