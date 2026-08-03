// PluginController - Controller for Plugin Module endpoints
import { Request, Response } from 'express';
import { PluginService } from '../../application/plugin/PluginService';

export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  async listPlugins(req: Request, res: Response): Promise<void> {
    try {
      const { category, projectId, enabled } = req.query;
      let plugins;
      
      if (category) {
        plugins = await this.pluginService.listByCategory(category as any);
      } else if (projectId) {
        plugins = await this.pluginService.listByProject(projectId as string);
      } else if (enabled === 'true') {
        plugins = await this.pluginService.listEnabledPlugins();
      } else {
        plugins = await this.pluginService.listPlugins();
      }
      
      res.status(200).json({ success: true, data: plugins });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async getPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params;
      const plugin = await this.pluginService.getPlugin(pluginId);
      res.status(200).json({ success: true, data: plugin });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { name, version, author, category, capabilities, configuration, enabled, projectId } = req.body;
      const plugin = await this.pluginService.create({
        name,
        version,
        author,
        category,
        capabilities,
        configuration,
        enabled,
        projectId,
      });
      res.status(201).json({ success: true, data: plugin });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async enablePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params;
      const plugin = await this.pluginService.enablePlugin(pluginId);
      res.status(200).json({ success: true, data: plugin });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async disablePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params;
      const plugin = await this.pluginService.disablePlugin(pluginId);
      res.status(200).json({ success: true, data: plugin });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params;
      const { configuration } = req.body;
      const plugin = await this.pluginService.updateConfiguration(pluginId, configuration);
      res.status(200).json({ success: true, data: plugin });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async deletePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params;
      await this.pluginService.deletePlugin(pluginId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params;
      const health = await this.pluginService.checkHealth(pluginId);
      res.status(200).json({ success: true, data: health });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async resolveByCategoryAndCapability(req: Request, res: Response): Promise<void> {
    try {
      const { category, capability } = req.params;
      const plugins = await this.pluginService.resolveByCategoryAndCapability(
        category as any,
        capability
      );
      res.status(200).json({ success: true, data: plugins });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default PluginController;