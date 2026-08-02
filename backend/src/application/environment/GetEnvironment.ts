// GetEnvironment - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';

export class GetEnvironment {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(id: string): Promise<EnvironmentEntity> {
    const environment = await this.environmentRepository.findById(id);
    if (!environment) {
      throw new Error(`Environment with id ${id} not found`);
    }
    return environment;
  }
}

export default GetEnvironment;