// GetEnvironment - Application Use Case
import { requireById } from '../shared/crudHelpers';
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';

export class GetEnvironment {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(id: string): Promise<EnvironmentEntity> {
    return requireById(this.environmentRepository, id, 'Environment');
  }
}

export default GetEnvironment;
