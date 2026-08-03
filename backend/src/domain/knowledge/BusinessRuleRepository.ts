// BusinessRuleRepository - Domain Repository Interface for Business Rules
import { BusinessRule } from './BusinessRuleEntity';

export interface BusinessRuleRepository {
  create(rule: BusinessRule): Promise<BusinessRule>;
  update(id: string, data: Partial<BusinessRule>): Promise<BusinessRule>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<BusinessRule | null>;
  findByProject(projectId: string): Promise<BusinessRule[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<BusinessRule[]>;
}

export default BusinessRuleRepository;