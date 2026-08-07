// KnowledgeController - Controller for Knowledge Management endpoints
import { Request, Response } from 'express';
import { CreateKnowledgeFlow } from '../../application/knowledge/CreateKnowledgeFlow';
import { UpdateKnowledgeFlow } from '../../application/knowledge/UpdateKnowledgeFlow';
import { DeleteKnowledgeFlow } from '../../application/knowledge/DeleteKnowledgeFlow';
import { GetKnowledgeFlow } from '../../application/knowledge/GetKnowledgeFlow';
import { ListKnowledgeFlows } from '../../application/knowledge/ListKnowledgeFlows';
import { ManageBusinessRules } from '../../application/knowledge/ManageBusinessRules';
import { ManageRuntimeVariables } from '../../application/knowledge/ManageRuntimeVariables';
import { ManageDependencies } from '../../application/knowledge/ManageDependencies';
import { ManageDocumentation } from '../../application/knowledge/ManageDocumentation';
import { ImportKnowledgeDocuments } from '../../application/knowledge/ImportKnowledgeDocuments';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class KnowledgeController {
    constructor(private readonly createKnowledgeFlow: CreateKnowledgeFlow, private readonly updateKnowledgeFlow: UpdateKnowledgeFlow, private readonly deleteKnowledgeFlow: DeleteKnowledgeFlow, private readonly getKnowledgeFlow: GetKnowledgeFlow, private readonly listKnowledgeFlows: ListKnowledgeFlows, private readonly manageBusinessRules: ManageBusinessRules, private readonly manageRuntimeVariables: ManageRuntimeVariables, private readonly manageDependencies: ManageDependencies, private readonly manageDocumentation: ManageDocumentation, private readonly importKnowledgeDocuments: ImportKnowledgeDocuments) { }
    // Business Flow endpoints
    async listFlows(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const flows = await this.listKnowledgeFlows.execute({ projectId });
        res.status(200).json(createSuccessResponse(flows));
    }
    async createFlow(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { name, description, tags, status, steps } = req.body;
        const flow = await this.createKnowledgeFlow.execute({
            projectId,
            name,
            description,
            tags,
            status,
            steps,
        });
        res.status(201).json(createSuccessResponse(flow));
    }
    async getFlow(req: Request, res: Response): Promise<void> {
        const { flowId } = req.params;
        const flow = await this.getKnowledgeFlow.execute(flowId);
        res.status(200).json(createSuccessResponse(flow));
    }
    async updateFlow(req: Request, res: Response): Promise<void> {
        const { flowId } = req.params;
        const { name, description, tags, status, steps } = req.body;
        const flow = await this.updateKnowledgeFlow.execute({
            id: flowId,
            name,
            description,
            tags,
            status,
            steps,
        });
        res.status(200).json(createSuccessResponse(flow));
    }
    async deleteFlow(req: Request, res: Response): Promise<void> {
        const { flowId } = req.params;
        await this.deleteKnowledgeFlow.execute(flowId);
        res.status(204).send();
    }
    // Business Rules endpoints
    async listBusinessRules(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const rules = await this.manageBusinessRules.list(projectId);
        res.status(200).json(createSuccessResponse(rules));
    }
    async createBusinessRule(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const body = req.body;
        const rule = await this.manageBusinessRules.create({
            projectId,
            name: body.name,
            description: body.description,
            ruleType: body.ruleType,
            condition: body.condition,
            expectedOutcome: body.expectedOutcome,
            severity: body.severity,
            linkedApiOperationIds: body.linkedApiOperationIds || [],
            linkedRequirementIds: body.linkedRequirementIds || [],
            tags: body.tags || [],
            isActive: body.isActive ?? true,
        });
        res.status(201).json(createSuccessResponse(rule));
    }
    async getBusinessRule(req: Request, res: Response): Promise<void> {
        const { ruleId } = req.params;
        const rule = await this.manageBusinessRules.get(ruleId);
        res.status(200).json(createSuccessResponse(rule));
    }
    async updateBusinessRule(req: Request, res: Response): Promise<void> {
        const { ruleId } = req.params;
        const body = req.body;
        const rule = await this.manageBusinessRules.update(ruleId, body);
        res.status(200).json(createSuccessResponse(rule));
    }
    async deleteBusinessRule(req: Request, res: Response): Promise<void> {
        const { ruleId } = req.params;
        await this.manageBusinessRules.delete(ruleId);
        res.status(204).send();
    }
    // Runtime Variables endpoints
    async listRuntimeVariables(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const variables = await this.manageRuntimeVariables.list(projectId);
        res.status(200).json(createSuccessResponse(variables));
    }
    async createRuntimeVariable(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const body = req.body;
        const variable = await this.manageRuntimeVariables.create({
            projectId,
            name: body.name,
            description: body.description,
            scope: body.scope,
            defaultValue: body.defaultValue,
            isSensitive: body.isSensitive ?? false,
            linkedApiOperationIds: body.linkedApiOperationIds || [],
            linkedRequirementIds: body.linkedRequirementIds || [],
            tags: body.tags || [],
        });
        res.status(201).json(createSuccessResponse(variable));
    }
    async getRuntimeVariable(req: Request, res: Response): Promise<void> {
        const { variableId } = req.params;
        const variable = await this.manageRuntimeVariables.get(variableId);
        res.status(200).json(createSuccessResponse(variable));
    }
    async updateRuntimeVariable(req: Request, res: Response): Promise<void> {
        const { variableId } = req.params;
        const body = req.body;
        const variable = await this.manageRuntimeVariables.update(variableId, body);
        res.status(200).json(createSuccessResponse(variable));
    }
    async deleteRuntimeVariable(req: Request, res: Response): Promise<void> {
        const { variableId } = req.params;
        await this.manageRuntimeVariables.delete(variableId);
        res.status(204).send();
    }
    // Dependencies endpoints
    async listDependencies(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const dependencies = await this.manageDependencies.list(projectId);
        res.status(200).json(createSuccessResponse(dependencies));
    }
    async createDependency(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const body = req.body;
        const dependency = await this.manageDependencies.create({
            projectId,
            name: body.name,
            description: body.description,
            dependencyType: body.dependencyType,
            target: body.target,
            version: body.version,
            isRequired: body.isRequired ?? true,
            linkedApiOperationIds: body.linkedApiOperationIds || [],
            linkedRequirementIds: body.linkedRequirementIds || [],
            tags: body.tags || [],
        });
        res.status(201).json(createSuccessResponse(dependency));
    }
    async getDependency(req: Request, res: Response): Promise<void> {
        const { dependencyId } = req.params;
        const dependency = await this.manageDependencies.get(dependencyId);
        res.status(200).json(createSuccessResponse(dependency));
    }
    async updateDependency(req: Request, res: Response): Promise<void> {
        const { dependencyId } = req.params;
        const body = req.body;
        const dependency = await this.manageDependencies.update(dependencyId, body);
        res.status(200).json(createSuccessResponse(dependency));
    }
    async deleteDependency(req: Request, res: Response): Promise<void> {
        const { dependencyId } = req.params;
        await this.manageDependencies.delete(dependencyId);
        res.status(204).send();
    }
    // Documentation endpoints
    async listDocumentation(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const docs = await this.manageDocumentation.list(projectId);
        res.status(200).json(createSuccessResponse(docs));
    }
    async createDocumentation(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const body = req.body;
        const doc = await this.manageDocumentation.create({
            projectId,
            title: body.title,
            content: body.content,
            category: body.category,
            tags: body.tags || [],
            linkedApiOperationIds: body.linkedApiOperationIds || [],
            linkedRequirementIds: body.linkedRequirementIds || [],
            author: body.author || '',
            version: body.version || '1.0.0',
        });
        res.status(201).json(createSuccessResponse(doc));
    }
    async getDocumentation(req: Request, res: Response): Promise<void> {
        const { docId } = req.params;
        const doc = await this.manageDocumentation.get(docId);
        res.status(200).json(createSuccessResponse(doc));
    }
    async updateDocumentation(req: Request, res: Response): Promise<void> {
        const { docId } = req.params;
        const body = req.body;
        const doc = await this.manageDocumentation.update(docId, body);
        res.status(200).json(createSuccessResponse(doc));
    }
    async deleteDocumentation(req: Request, res: Response): Promise<void> {
        const { docId } = req.params;
        await this.manageDocumentation.delete(docId);
        res.status(204).send();
    }
    async importDocuments(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const rawFiles = req.files as Express.Multer.File[] | undefined;
        const files = rawFiles ?? [];
        if (files.length === 0) {
            res.status(400).json({ success: false, message: 'No files uploaded' });
            return;
        }
        const result = await this.importKnowledgeDocuments.execute(projectId, files.map((f) => ({
            originalname: f.originalname,
            buffer: f.buffer,
        })));
        res.status(200).json(createSuccessResponse(result));
    }
}
export default KnowledgeController;

