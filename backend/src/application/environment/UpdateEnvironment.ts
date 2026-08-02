// UpdateEnvironment - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';

export class UpdateEnvironment {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(params: {
    id: string;
    name?: string;
    baseUrl?: string;
    description?: string;
    authentication?: any;
    variables?: Record<string, string>;
    timeout?: number;
    isDefault?: boolean;
  }): Promise<EnvironmentEntity> {
    const existing = await this.environmentRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Environment with id ${params.id} not found`);
    }

    if (params.name !== undefined && !params.name.trim()) {
      throw new Error('Environment Name cannot be empty');
    }

    if (params.baseUrl !== undefined && !params.baseUrl.trim()) {
      throw new Error('Base URL cannot be empty');
    }

    if (params.name && params.name.trim() !== existing.name) {
      const exists = await this.environmentRepository.existsByName(params.name.trim(), existing.projectId);
      if (exists) {
        throw new Error(`Environment with name "${params.name}" already exists in this project`);
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.baseUrl !== undefined) updateData.baseUrl = params.baseUrl.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.authentication !== undefined) updateData.authentication = params.authentication;
    if (params.variables !== undefined) updateData.variables = params.variables;
    if (params.timeout !== undefined) {
      if (params.timeout <= 0) {
        throw new Error('Timeout must be greater than 0');
      }
      updateData.timeout = params.timeout;
    }
    if (params.isDefault !== undefined) updateData.isDefault = params.isDefault;

    return this.environmentRepository.update(params.id, updateData);
  }
}

export default UpdateEnvironment;