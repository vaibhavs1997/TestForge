// PluginLoader - Loads built-in plugins on system startup
// Registers existing providers and notification channels as plugins.

import { PluginEntity, PluginCategory, PluginCapability } from '../../domain/plugin';
import { PluginRegistry } from './PluginRegistry';

export class PluginLoader {
  constructor(private readonly pluginRegistry: PluginRegistry) {}

  async loadBuiltInPlugins(): Promise<void> {
    // Register Provider plugins
    await this.registerProviderPlugins();
    
    // Register Notification plugins
    await this.registerNotificationPlugins();
    
    // Register Validation plugins
    await this.registerValidationPlugins();
    
    // Register Report Export plugins
    await this.registerReportExportPlugins();
    
    // Register Secret Management plugins
    await this.registerSecretManagementPlugins();
    
    // Register Test Data Generator plugins
    await this.registerTestDataGeneratorPlugins();
  }

  private async registerProviderPlugins(): Promise<void> {
    const providers: Array<{ name: string; capabilities: PluginCapability[] }> = [
      {
        name: 'Mailtrap',
        capabilities: [
          { name: 'email', description: 'Email delivery via Mailtrap', version: '1.0.0' },
          { name: 'inbox', description: 'Inbox access', version: '1.0.0' },
        ],
      },
      {
        name: 'MailHog',
        capabilities: [
          { name: 'email', description: 'Email delivery via MailHog', version: '1.0.0' },
          { name: 'inbox', description: 'Inbox access', version: '1.0.0' },
        ],
      },
      {
        name: 'TempMail',
        capabilities: [
          { name: 'email', description: 'Temporary email via TempMail', version: '1.0.0' },
          { name: 'inbox', description: 'Inbox access', version: '1.0.0' },
        ],
      },
      {
        name: 'Twilio',
        capabilities: [
          { name: 'sms', description: 'SMS via Twilio', version: '1.0.0' },
          { name: 'otp', description: 'OTP verification', version: '1.0.0' },
        ],
      },
      {
        name: 'StripeSandbox',
        capabilities: [
          { name: 'payment', description: 'Payment processing via Stripe Sandbox', version: '1.0.0' },
          { name: 'webhook', description: 'Webhook handling', version: '1.0.0' },
        ],
      },
      {
        name: 'Custom',
        capabilities: [
          { name: 'custom', description: 'Custom provider', version: '1.0.0' },
        ],
      },
    ];

    for (const provider of providers) {
      const now = Date.now();
      const plugin = new PluginEntity(
        crypto.randomUUID(),
        provider.name,
        '1.0.0',
        'TestForge',
        'Provider',
        provider.capabilities,
        {},
        true,
        null,
        now,
        now
      );
      await this.pluginRegistry.register(plugin);
    }
  }

  private async registerNotificationPlugins(): Promise<void> {
    const channels = [
      {
        name: 'Email',
        capabilities: [
          { name: 'send', description: 'Send email notification', version: '1.0.0' },
        ],
      },
      {
        name: 'Slack',
        capabilities: [
          { name: 'send', description: 'Send Slack notification', version: '1.0.0' },
        ],
      },
      {
        name: 'MicrosoftTeams',
        capabilities: [
          { name: 'send', description: 'Send Teams notification', version: '1.0.0' },
        ],
      },
      {
        name: 'Webhook',
        capabilities: [
          { name: 'send', description: 'Send webhook notification', version: '1.0.0' },
        ],
      },
    ];

    for (const channel of channels) {
      const now = Date.now();
      const plugin = new PluginEntity(
        crypto.randomUUID(),
        channel.name,
        '1.0.0',
        'TestForge',
        'Notification',
        channel.capabilities,
        {},
        true,
        null,
        now,
        now
      );
      await this.pluginRegistry.register(plugin);
    }
  }

  private async registerValidationPlugins(): Promise<void> {
    const validators = [
      {
        name: 'JsonSchemaValidator',
        capabilities: [
          { name: 'validate', description: 'JSON schema validation', version: '1.0.0' },
        ],
      },
      {
        name: 'AssertionValidator',
        capabilities: [
          { name: 'assert', description: 'Assertion validation', version: '1.0.0' },
        ],
      },
    ];

    for (const validator of validators) {
      const now = Date.now();
      const plugin = new PluginEntity(
        crypto.randomUUID(),
        validator.name,
        '1.0.0',
        'TestForge',
        'Validation',
        validator.capabilities,
        {},
        true,
        null,
        now,
        now
      );
      await this.pluginRegistry.register(plugin);
    }
  }

  private async registerReportExportPlugins(): Promise<void> {
    const exporters = [
      {
        name: 'JsonExporter',
        capabilities: [
          { name: 'export', description: 'Export report as JSON', version: '1.0.0' },
        ],
      },
      {
        name: 'HtmlExporter',
        capabilities: [
          { name: 'export', description: 'Export report as HTML', version: '1.0.0' },
        ],
      },
      {
        name: 'PdfExporter',
        capabilities: [
          { name: 'export', description: 'Export report as PDF', version: '1.0.0' },
        ],
      },
    ];

    for (const exporter of exporters) {
      const now = Date.now();
      const plugin = new PluginEntity(
        crypto.randomUUID(),
        exporter.name,
        '1.0.0',
        'TestForge',
        'ReportExport',
        exporter.capabilities,
        {},
        true,
        null,
        now,
        now
      );
      await this.pluginRegistry.register(plugin);
    }
  }

  private async registerSecretManagementPlugins(): Promise<void> {
    const managers = [
      {
        name: 'EnvironmentSecretManager',
        capabilities: [
          { name: 'store', description: 'Store secrets in environment', version: '1.0.0' },
          { name: 'retrieve', description: 'Retrieve secrets from environment', version: '1.0.0' },
        ],
      },
    ];

    for (const manager of managers) {
      const now = Date.now();
      const plugin = new PluginEntity(
        crypto.randomUUID(),
        manager.name,
        '1.0.0',
        'TestForge',
        'SecretManagement',
        manager.capabilities,
        {},
        true,
        null,
        now,
        now
      );
      await this.pluginRegistry.register(plugin);
    }
  }

  private async registerTestDataGeneratorPlugins(): Promise<void> {
    const generators = [
      {
        name: 'FakerGenerator',
        capabilities: [
          { name: 'generate', description: 'Generate fake test data', version: '1.0.0' },
        ],
      },
      {
        name: 'DatasetGenerator',
        capabilities: [
          { name: 'generate', description: 'Generate dataset from schema', version: '1.0.0' },
        ],
      },
    ];

    for (const generator of generators) {
      const now = Date.now();
      const plugin = new PluginEntity(
        crypto.randomUUID(),
        generator.name,
        '1.0.0',
        'TestForge',
        'TestDataGenerator',
        generator.capabilities,
        {},
        true,
        null,
        now,
        now
      );
      await this.pluginRegistry.register(plugin);
    }
  }
}

export default PluginLoader;