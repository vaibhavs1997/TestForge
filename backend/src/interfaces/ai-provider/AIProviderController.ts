// AIProviderController - Controller for AI Provider Management endpoints
import { Request, Response } from 'express';
import { ManageAIProviders } from '../../application/ai-provider/ManageAIProviders';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class AIProviderController {
  constructor(private readonly manageAIProviders: ManageAIProviders) {}

  async listProviders(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const providers = await this.manageAIProviders.listByProject(projectId);
      res.status(200).json(createSuccessResponse(providers));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.getProvider(providerId);
      res.status(200).json(createSuccessResponse(provider));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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
      res.status(201).json(createSuccessResponse(created));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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
      res.status(200).json(createSuccessResponse(updated));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async deleteProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      await this.manageAIProviders.delete(providerId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async testProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const result = await this.manageAIProviders.testConnection(providerId);
      res.status(200).json(createSuccessResponse(result));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async enableProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.enable(providerId);
      res.status(200).json(createSuccessResponse(provider));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async disableProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.disable(providerId);
      res.status(200).json(createSuccessResponse(provider));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async setDefaultProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageAIProviders.setDefault(providerId);
      res.status(200).json(createSuccessResponse(provider));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async listSupportedTypes(req: Request, res: Response): Promise<void> {
    try {
      const types = this.manageAIProviders.listSupportedTypes();
      res.status(200).json(createSuccessResponse(types));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async listAdapters(req: Request, res: Response): Promise<void> {
    try {
      const adapters = this.manageAIProviders.listAdapters();
      res.status(200).json(createSuccessResponse(adapters));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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
      res.status(200).json(createSuccessResponse(estimate));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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
      res.status(200).json(createSuccessResponse(result));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default AIProviderController;