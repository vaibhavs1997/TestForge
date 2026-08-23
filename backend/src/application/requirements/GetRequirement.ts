// GetRequirement - Application Use Case
import { requireById } from '../shared/crudHelpers.js';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';

export class GetRequirement {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(id: string): Promise<RequirementEntity> {
    return requireById(this.requirementRepository, id, 'Requirement');
  }
}

export default GetRequirement;
