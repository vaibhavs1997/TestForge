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
      if (params.approvalStatus) {
        return items.filter(item => item.approvalStatus === params.approvalStatus);
      }
      return items;
    }
    return this.requirementRepository.list();
  }
}

export default ListRequirements;