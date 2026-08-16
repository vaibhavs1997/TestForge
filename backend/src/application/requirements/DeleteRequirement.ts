// DeleteRequirement - Application Use Case
import { deleteById } from '../shared/crudHelpers';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';

export class DeleteRequirement {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(id: string): Promise<void> {
    await deleteById(this.requirementRepository, id, 'Requirement');
  }
}

export default DeleteRequirement;
