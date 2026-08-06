// DeleteEnvironment - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EventPublisher } from '../EventPublisher';

export class DeleteEnvironment {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.environmentRepository.findById(id);
    if (!existing) {
      throw new Error(`Environment with id ${id} not found`);
    }
    await this.environmentRepository.delete(id);

    if (this.eventPublisher) {
      await this.eventPublisher.deleted(
        'environment',
        existing.id,
        existing.projectId,
        'Environment',
        existing as unknown as Record<string, unknown>,
      );
    }
  }
}

export default DeleteEnvironment;