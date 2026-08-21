// RuntimeVariableRepository - Domain Repository Interface for Runtime Variables
import { RuntimeVariable } from './RuntimeVariableEntity.js';

export interface RuntimeVariableRepository {
  create(variable: RuntimeVariable): Promise<RuntimeVariable>;
  update(id: string, data: Partial<RuntimeVariable>): Promise<RuntimeVariable>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<RuntimeVariable | null>;
  findByProject(projectId: string): Promise<RuntimeVariable[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<RuntimeVariable[]>;
}

export default RuntimeVariableRepository;