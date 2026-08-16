// GetRequirement - Application Use Case
import { requireById } from '../shared/crudHelpers';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';

export class GetRequirement {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(id: string): Promise<RequirementEntity> {
    return requireById(this.requirementRepository, id, 'Requirement');
  }
}

export default GetRequirement;
