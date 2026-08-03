// GetRequirement - Application Use Case
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';

export class GetRequirement {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(id: string): Promise<RequirementEntity> {
    const requirement = await this.requirementRepository.findById(id);
    if (!requirement) {
      throw new Error(`Requirement with id ${id} not found`);
    }
    return requirement;
  }
}

export default GetRequirement;