// ApiServiceEntity - Domain Entity for API Service

export class ApiServiceEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public description: string,
    public version: string,
    public readonly tags: string[],
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default ApiServiceEntity;