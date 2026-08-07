export interface EnvironmentRepository {
  create(environment: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  findDefault(projectId: string): Promise<any>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<any[]>;
  upsertManyByName(
    projectId: string,
    items: Array<{
      name: string;
      baseUrl: string;
      description?: string;
      authentication?: unknown;
      variables?: Record<string, string>;
      timeout?: number;
    }>,
  ): Promise<{ created: number; updated: number; environments: any[] }>;
}