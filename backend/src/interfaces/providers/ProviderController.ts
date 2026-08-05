// ProviderController - Controller for Provider Framework endpoints
import { Request, Response } from 'express';
import { ManageProviders } from '../../application/providers/ManageProviders';
import { ProviderAdapterRegistry } from '../../infrastructure/providers/adapters/ProviderAdapterRegistry';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class ProviderController {
  constructor(private readonly manageProviders: ManageProviders) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const provider = await this.manageProviders.create({ projectId, ...req.body });
      res.status(201).json(createSuccessResponse(provider));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageProviders.get(providerId);
      const adapter = ProviderAdapterRegistry.getInstance().get(provider.adapter);
      if (!adapter) {
        res.status(400).json(createErrorResponse('No adapter', 'VALIDATION_ERROR'));
        return;
      }
      const result = await adapter.testConnection(provider.configuration, provider.credentials);
      res.status(200).json(createSuccessResponse(result));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageProviders.get(providerId);
      res.status(200).json(createSuccessResponse(provider));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async listProviders(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { category } = req.query;
      let providers;
      if (category) {
        providers = await this.manageProviders.listByCategory(projectId, category as string);
      } else {
        providers = await this.manageProviders.listByProject(projectId);
      }
      res.status(200).json(createSuccessResponse(providers));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async listAdapterTypes(req: Request, res: Response): Promise<void> {
    try {
      const adapters = ProviderAdapterRegistry.getInstance().list();
      res.status(200).json(
        createSuccessResponse(
          adapters.map((a) => ({
            type: a.type,
            category: a.category,
            capabilities: a.getCapabilities(),
          }))
        )
      );
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async updateProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const provider = await this.manageProviders.update(providerId, req.body);
      res.status(200).json(createSuccessResponse(provider));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async deleteProvider(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      await this.manageProviders.delete(providerId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}
