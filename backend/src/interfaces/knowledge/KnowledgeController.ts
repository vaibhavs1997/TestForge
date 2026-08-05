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
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class KnowledgeController {
  constructor(
    private readonly createKnowledgeFlow: CreateKnowledgeFlow,
    private readonly updateKnowledgeFlow: UpdateKnowledgeFlow,
    private readonly deleteKnowledgeFlow: DeleteKnowledgeFlow,
    private readonly getKnowledgeFlow: GetKnowledgeFlow,
    private readonly listKnowledgeFlows: ListKnowledgeFlows,
    private readonly manageBusinessRules: ManageBusinessRules,
    private readonly manageRuntimeVariables: ManageRuntimeVariables,
    private readonly manageDependencies: ManageDependencies,
    private readonly manageDocumentation: ManageDocumentation
  ) {}

  // Business Flow endpoints
  async listFlows(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const flows = await this.listKnowledgeFlows.execute({ projectId });
      res.status(200).json(createSuccessResponse(flows));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async createFlow(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      const flow = await this.getKnowledgeFlow.execute(flowId);
      res.status(200).json(createSuccessResponse(flow));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async updateFlow(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async deleteFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      await this.deleteKnowledgeFlow.execute(flowId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  // Business Rules endpoints
  async listBusinessRules(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const rules = await this.manageBusinessRules.list(projectId);
      res.status(200).json(createSuccessResponse(rules));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async createBusinessRule(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getBusinessRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const rule = await this.manageBusinessRules.get(ruleId);
      res.status(200).json(createSuccessResponse(rule));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async updateBusinessRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const body = req.body;

      const rule = await this.manageBusinessRules.update(ruleId, body);
      res.status(200).json(createSuccessResponse(rule));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async deleteBusinessRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      await this.manageBusinessRules.delete(ruleId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  // Runtime Variables endpoints
  async listRuntimeVariables(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const variables = await this.manageRuntimeVariables.list(projectId);
      res.status(200).json(createSuccessResponse(variables));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async createRuntimeVariable(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getRuntimeVariable(req: Request, res: Response): Promise<void> {
    try {
      const { variableId } = req.params;
      const variable = await this.manageRuntimeVariables.get(variableId);
      res.status(200).json(createSuccessResponse(variable));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async updateRuntimeVariable(req: Request, res: Response): Promise<void> {
    try {
      const { variableId } = req.params;
      const body = req.body;

      const variable = await this.manageRuntimeVariables.update(variableId, body);
      res.status(200).json(createSuccessResponse(variable));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async deleteRuntimeVariable(req: Request, res: Response): Promise<void> {
    try {
      const { variableId } = req.params;
      await this.manageRuntimeVariables.delete(variableId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  // Dependencies endpoints
  async listDependencies(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const dependencies = await this.manageDependencies.list(projectId);
      res.status(200).json(createSuccessResponse(dependencies));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async createDependency(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getDependency(req: Request, res: Response): Promise<void> {
    try {
      const { dependencyId } = req.params;
      const dependency = await this.manageDependencies.get(dependencyId);
      res.status(200).json(createSuccessResponse(dependency));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async updateDependency(req: Request, res: Response): Promise<void> {
    try {
      const { dependencyId } = req.params;
      const body = req.body;

      const dependency = await this.manageDependencies.update(dependencyId, body);
      res.status(200).json(createSuccessResponse(dependency));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async deleteDependency(req: Request, res: Response): Promise<void> {
    try {
      const { dependencyId } = req.params;
      await this.manageDependencies.delete(dependencyId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  // Documentation endpoints
  async listDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const docs = await this.manageDocumentation.list(projectId);
      res.status(200).json(createSuccessResponse(docs));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async createDocumentation(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { docId } = req.params;
      const doc = await this.manageDocumentation.get(docId);
      res.status(200).json(createSuccessResponse(doc));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async updateDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { docId } = req.params;
      const body = req.body;

      const doc = await this.manageDocumentation.update(docId, body);
      res.status(200).json(createSuccessResponse(doc));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async deleteDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { docId } = req.params;
      await this.manageDocumentation.delete(docId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }
}

export default KnowledgeController;