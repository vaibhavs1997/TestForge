// CreateEnvironment - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';

export class CreateEnvironment {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(params: {
    projectId: string;
    name: string;
    baseUrl: string;
    description?: string;
    authentication?: any;
    variables?: Record<string, string>;
    timeout?: number;
  }): Promise<EnvironmentEntity> {
    if (!params.name || !params.name.trim()) {
      throw new Error('Environment Name is required');
    }

    if (!params.baseUrl || !params.baseUrl.trim()) {
      throw new Error('Base URL is required');
    }

    const trimmedName = params.name.trim();
    const exists = await this.environmentRepository.existsByName(trimmedName, params.projectId);
    if (exists) {
      throw new Error(`Environment with name "${params.name}" already exists in this project`);
    }

    const defaultEnv = await this.environmentRepository.findDefault(params.projectId);
    if (defaultEnv) {
      throw new Error('A default environment already exists. Only one default environment is allowed.');
    }

    const now = Date.now();
    const environment = new EnvironmentEntity(
      crypto.randomUUID(),
      params.projectId,
      trimmedName,
      params.baseUrl.trim(),
      params.description?.trim() || '',
      params.authentication || null,
      params.variables || {},
      params.timeout || 30000,
      now,
      now
    );

    return this.environmentRepository.create(environment);
  }
}

export default CreateEnvironment;