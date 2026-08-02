// DeleteEnvironment - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';

export class DeleteEnvironment {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.environmentRepository.findById(id);
    if (!existing) {
      throw new Error(`Environment with id ${id} not found`);
    }
    await this.environmentRepository.delete(id);
  }
}

export default DeleteEnvironment;