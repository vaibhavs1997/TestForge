// ApiOperationEntity - Domain Entity for API Operation

export class ApiOperationEntity {
  constructor(
    public readonly id: string,
    public readonly serviceId: string,
    public name: string,
    public method: string,
    public path: string,
    public description: string,
    public authenticationType: string,
    public status: string,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default ApiOperationEntity;