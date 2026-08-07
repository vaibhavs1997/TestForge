// EnvironmentController - Controller for Environment Management endpoints
import { Request, Response } from 'express';
import { CreateEnvironment } from '../../application/environment/CreateEnvironment';
import { UpdateEnvironment } from '../../application/environment/UpdateEnvironment';
import { DeleteEnvironment } from '../../application/environment/DeleteEnvironment';
import { GetEnvironment } from '../../application/environment/GetEnvironment';
import { ListEnvironments } from '../../application/environment/ListEnvironments';
import { UpsertEnvironments } from '../../application/environment/UpsertEnvironments';
import { createSuccessResponse } from '../../shared/ApiResponse';

export class EnvironmentController {
  constructor(
    private readonly createEnvironmentUseCase: CreateEnvironment,
    private readonly updateEnvironmentUseCase: UpdateEnvironment,
    private readonly deleteEnvironmentUseCase: DeleteEnvironment,
    private readonly getEnvironmentUseCase: GetEnvironment,
    private readonly listEnvironmentsUseCase: ListEnvironments,
    private readonly upsertEnvironmentsUseCase: UpsertEnvironments,
  ) {}

  async listEnvironments(req: Request, res: Response): Promise<void> {
    const projectId = req.params.projectId;
    const environments = await this.listEnvironmentsUseCase.execute({ projectId });
    res.status(200).json(createSuccessResponse(environments));
  }

  async createEnvironment(req: Request, res: Response): Promise<void> {
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
  }

  async upsertEnvironments(req: Request, res: Response): Promise<void> {
    const projectId = req.params.projectId;
    const body = req.body as { environments?: unknown };
    const items = Array.isArray(body?.environments) ? body.environments : [];

    const result = await this.upsertEnvironmentsUseCase.execute({
      projectId,
      items: items as {
        name: string;
        baseUrl: string;
        description?: string;
        authentication?: unknown;
        variables?: Record<string, string>;
        timeout?: number;
      }[],
    });

    res.status(200).json(createSuccessResponse(result));
  }

  async getEnvironment(req: Request, res: Response): Promise<void> {
    const { environmentId } = req.params;
    const environment = await this.getEnvironmentUseCase.execute(environmentId);
    res.status(200).json(createSuccessResponse(environment));
  }

  async updateEnvironment(req: Request, res: Response): Promise<void> {
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
  }

  async deleteEnvironment(req: Request, res: Response): Promise<void> {
    const { environmentId } = req.params;
    await this.deleteEnvironmentUseCase.execute(environmentId);
    res.status(204).send();
  }
}

export default EnvironmentController;