// ListRequirements - Application Use Case
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';

export class ListRequirements {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(params: {
    projectId?: string;
    approvalStatus?: string;
  }): Promise<RequirementEntity[]> {
    if (params.projectId) {
      const items = await this.requirementRepository.findByProject(params.projectId);
      const now = Date.now();
      const activeItems = [];
      for (const item of items) {
        if (item.generationPending && item.generationExpiresAt !== null && item.generationExpiresAt <= now) {
          await this.requirementRepository.delete(item.id);
          continue;
        }
        activeItems.push(item);
      }
      if (params.approvalStatus) {
        return activeItems.filter(item => item.approvalStatus === params.approvalStatus);
      }
      return activeItems;
    }
    return this.requirementRepository.list();
  }
}

export default ListRequirements;
