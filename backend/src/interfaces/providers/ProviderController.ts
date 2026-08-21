// ProviderController - Controller for Provider Framework endpoints
import { Request, Response } from 'express';
import { ManageProviders } from '../../application/providers/ManageProviders.js';
import { ProviderAdapterRegistry } from '../../infrastructure/providers/adapters/ProviderAdapterRegistry.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class ProviderController {
    constructor(private readonly manageProviders: ManageProviders) { }
    async create(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const provider = await this.manageProviders.create({ projectId, ...req.body });
        res.status(201).json(createSuccessResponse(provider));
    }
    async testConnection(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const provider = await this.manageProviders.get(providerId);
        const adapter = ProviderAdapterRegistry.getInstance().get(provider.adapter);
        if (!adapter) {
            throw new Error('No adapter');
        }
        const result = await adapter.testConnection(provider.configuration, provider.credentials);
        res.status(200).json(createSuccessResponse(result));
    }
    async getProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const provider = await this.manageProviders.get(providerId);
        res.status(200).json(createSuccessResponse(provider));
    }
    async listProviders(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { category } = req.query;
        let providers;
        if (category) {
            providers = await this.manageProviders.listByCategory(projectId, category as string);
        }
        else {
            providers = await this.manageProviders.listByProject(projectId);
        }
        res.status(200).json(createSuccessResponse(providers));
    }
    async listAdapterTypes(req: Request, res: Response): Promise<void> {
        const adapters = ProviderAdapterRegistry.getInstance().list();
        res.status(200).json(createSuccessResponse(adapters.map(a => ({ type: a.type, category: a.category, capabilities: a.getCapabilities() }))));
    }
    async updateProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const provider = await this.manageProviders.update(providerId, req.body);
        res.status(200).json(createSuccessResponse(provider));
    }
    async deleteProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        await this.manageProviders.delete(providerId);
        res.status(204).send();
    }
}

