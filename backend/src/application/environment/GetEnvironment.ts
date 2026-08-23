// GetEnvironment - Application Use Case
import { requireById } from '../shared/crudHelpers.js';
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository.js';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity.js';

export class GetEnvironment {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(id: string): Promise<EnvironmentEntity> {
    return requireById(this.environmentRepository, id, 'Environment');
  }
}

export default GetEnvironment;
