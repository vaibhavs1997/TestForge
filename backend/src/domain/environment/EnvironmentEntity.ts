// EnvironmentEntity - Domain Entity for Environment

export class EnvironmentEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public baseUrl: string,
    public description: string,
    public authentication: any,
    public variables: Record<string, string>,
    public timeout: number,
    public readonly createdAt: number,
    public updatedAt: number,
    public isDefault?: boolean,
  ) {}
}

export default EnvironmentEntity;
