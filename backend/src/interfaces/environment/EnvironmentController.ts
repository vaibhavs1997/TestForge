// EnvironmentController - Controller for Environment Management endpoints
import { Request, Response } from 'express';
import { CreateEnvironment } from '../../application/environment/CreateEnvironment';
import { UpdateEnvironment } from '../../application/environment/UpdateEnvironment';
import { DeleteEnvironment } from '../../application/environment/DeleteEnvironment';
import { GetEnvironment } from '../../application/environment/GetEnvironment';
import { ListEnvironments } from '../../application/environment/ListEnvironments';
import { ApiResponse, createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class EnvironmentController {
  constructor(
    private readonly createEnvironmentUseCase: CreateEnvironment,
    private readonly updateEnvironmentUseCase: UpdateEnvironment,
    private readonly deleteEnvironmentUseCase: DeleteEnvironment,
    private readonly getEnvironmentUseCase: GetEnvironment,
    private readonly listEnvironmentsUseCase: ListEnvironments
  ) {}

  async listEnvironments(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const environments = await this.listEnvironmentsUseCase.execute({ projectId });
      res.status(200).json(createSuccessResponse(environments));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async createEnvironment(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { name, baseUrl, description, authentication, variables, timeout } = req.body;

      const environment = await this.createEnvironmentUseCase.execute({
        projectId,
        name,
        baseUrl,
        description,
        authentication,
        variables,
        timeout,
      });

      res.status(201).json(createSuccessResponse(environment));
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists') || error.message.includes('Only one default')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getEnvironment(req: Request, res: Response): Promise<void> {
    try {
      const { environmentId } = req.params;
      const environment = await this.getEnvironmentUseCase.execute(environmentId);
      res.status(200).json(createSuccessResponse(environment));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async updateEnvironment(req: Request, res: Response): Promise<void> {
    try {
      const { environmentId } = req.params;
      const { name, baseUrl, description, authentication, variables, timeout, isDefault } = req.body;

      const environment = await this.updateEnvironmentUseCase.execute({
        id: environmentId,
        name,
        baseUrl,
        description,
        authentication,
        variables,
        timeout,
        isDefault,
      });

      res.status(200).json(createSuccessResponse(environment));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('required') || error.message.includes('cannot be empty') || error.message.includes('must be greater')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('already exists') || error.message.includes('Only one default')) {
        res.status(409).json(createErrorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async deleteEnvironment(req: Request, res: Response): Promise<void> {
    try {
      const { environmentId } = req.params;
      await this.deleteEnvironmentUseCase.execute(environmentId);
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

export default EnvironmentController;