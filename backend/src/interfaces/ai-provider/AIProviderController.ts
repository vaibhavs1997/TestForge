// AIProviderController - Controller for AI Provider Management endpoints
import { Request, Response } from 'express';
import { ManageAIProviders } from '../../application/ai-provider/ManageAIProviders';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class AIProviderController {
    constructor(private readonly manageAIProviders: ManageAIProviders) { }
    private toPublicProvider(provider: any): any {
        return {
            ...provider,
            apiKey: provider.apiKey ? '********' : null,
        };
    }
    async listProviders(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const providers = await this.manageAIProviders.listByProject(projectId);
        res.status(200).json(createSuccessResponse(providers.map((provider) => this.toPublicProvider(provider))));
    }
    async getProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const provider = await this.manageAIProviders.getProvider(providerId);
        res.status(200).json(createSuccessResponse(this.toPublicProvider(provider)));
    }
    async createProvider(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { name, provider, model, endpoint, apiKey, organization, temperature, topP, maxTokens, timeout, enabled, default: isDefault, } = req.body;
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
        res.status(201).json(createSuccessResponse(this.toPublicProvider(created)));
    }
    async updateProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const { name, provider, model, endpoint, apiKey, organization, temperature, topP, maxTokens, timeout, enabled, default: isDefault, } = req.body;
        const updated = await this.manageAIProviders.update(providerId, {
            name,
            provider,
            model,
            endpoint,
            apiKey: apiKey && apiKey !== '********' ? apiKey : undefined,
            organization,
            temperature,
            topP,
            maxTokens,
            timeout,
            enabled,
            default: isDefault,
        });
        res.status(200).json(createSuccessResponse(this.toPublicProvider(updated)));
    }
    async deleteProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        await this.manageAIProviders.delete(providerId);
        res.status(204).send();
    }
    async testProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const result = await this.manageAIProviders.testConnection(providerId);
        res.status(200).json(createSuccessResponse(result));
    }
    async enableProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const provider = await this.manageAIProviders.enable(providerId);
        res.status(200).json(createSuccessResponse(this.toPublicProvider(provider)));
    }
    async disableProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const provider = await this.manageAIProviders.disable(providerId);
        res.status(200).json(createSuccessResponse(this.toPublicProvider(provider)));
    }
    async setDefaultProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const provider = await this.manageAIProviders.setDefault(providerId);
        res.status(200).json(createSuccessResponse(this.toPublicProvider(provider)));
    }
    async listSupportedTypes(req: Request, res: Response): Promise<void> {
        const types = this.manageAIProviders.listSupportedTypes();
        res.status(200).json(createSuccessResponse(types));
    }
    async listAdapters(req: Request, res: Response): Promise<void> {
        const adapters = this.manageAIProviders.listAdapters();
        res.status(200).json(createSuccessResponse(adapters));
    }
    async estimateProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const { messages, maxTokens } = req.body;
        const estimate = await this.manageAIProviders.estimate(providerId, messages || [], maxTokens);
        res.status(200).json(createSuccessResponse(estimate));
    }
    async generateProvider(req: Request, res: Response): Promise<void> {
        const { providerId } = req.params;
        const { messages, options } = req.body;
        const result = await this.manageAIProviders.generate(providerId, messages || [], options);
        res.status(200).json(createSuccessResponse(result));
    }
}
export default AIProviderController;

