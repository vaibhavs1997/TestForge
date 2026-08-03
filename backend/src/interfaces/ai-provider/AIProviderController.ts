// AIProviderController - Controller for AI Provider Management endpoints
import { Request, Response } from 'express';
import { ManageAIProviders } from '../../application/ai-provider/ManageAIProviders';

export class AIProviderController {
  constructor(private readonly manageAIProviders: ManageAIProviders) {}

  async listProviders(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const providers = await this.manageAIProviders.listByProject(projectId);
      res.status(200).json({ success: true, data: providers });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async getProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.getProvider(providerId);
      res.status(200).json({ success: true, data: provider });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createProvider(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const {
        name,
        provider,
        model,
        endpoint,
        apiKey,
        organization,
        temperature,
        topP,
        maxTokens,
        timeout,
        enabled,
        default: isDefault,
      } = req.body;

      const created = await this.manageAIProviders.create({
        projectId,
        name,
        provider,
        model,
        endpoint,
        apiKey,
        organization,
        temperature,
        topP,
        maxTokens,
        timeout,
        enabled,
        default: isDefault,
      });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async updateProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const {
        name,
        provider,
        model,
        endpoint,
        apiKey,
        organization,
        temperature,
        topP,
        maxTokens,
        timeout,
        enabled,
        default: isDefault,
      } = req.body;

      const updated = await this.manageAIProviders.update(providerId, {
        name,
        provider,
        model,
        endpoint,
        apiKey,
        organization,
        temperature,
        topP,
        maxTokens,
        timeout,
        enabled,
        default: isDefault,
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async deleteProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      await this.manageAIProviders.delete(providerId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async testProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const result = await this.manageAIProviders.testConnection(providerId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async enableProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.enable(providerId);
      res.status(200).json({ success: true, data: provider });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async disableProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.disable(providerId);
      res.status(200).json({ success: true, data: provider });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async setDefaultProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.setDefault(providerId);
      res.status(200).json({ success: true, data: provider });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async listSupportedTypes(req: Request, res: Response): Promise<void> {
    try {
      const types = this.manageAIProviders.listSupportedTypes();
      res.status(200).json({ success: true, data: types });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async listAdapters(req: Request, res: Response): Promise<void> {
    try {
      const adapters = this.manageAIProviders.listAdapters();
      res.status(200).json({ success: true, data: adapters });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async estimateProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { messages, maxTokens } = req.body;
      const estimate = await this.manageAIProviders.estimate(
        providerId,
        messages || [],
        maxTokens
      );
      res.status(200).json({ success: true, data: estimate });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async generateProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { messages, options } = req.body;
      const result = await this.manageAIProviders.generate(
        providerId,
        messages || [],
        options
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default AIProviderController;