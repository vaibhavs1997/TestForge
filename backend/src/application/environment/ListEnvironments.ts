// ListEnvironments - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';

export class ListEnvironments {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(params: {
    projectId?: string;
  }): Promise<EnvironmentEntity[]> {
    if (params.projectId) {
      return this.environmentRepository.findByProject(params.projectId);
    }
    return this.environmentRepository.list();
  }
}

export default ListEnvironments;