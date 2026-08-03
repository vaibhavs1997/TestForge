// DeleteRequirement - Application Use Case
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';

export class DeleteRequirement {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.requirementRepository.findById(id);
    if (!existing) {
      throw new Error(`Requirement with id ${id} not found`);
    }
    await this.requirementRepository.delete(id);
  }
}

export default DeleteRequirement;