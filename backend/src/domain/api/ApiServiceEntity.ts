// ApiServiceEntity - Domain Entity for API Service

export class ApiServiceEntity {
  /** Stable import key used to match future imports for the same source service. */
  importKey: string | null = null;
  /** Raw source contract snapshot preserved from import. */
  sourceContract: Record<string, unknown> | null = null;

  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public description: string,
    public version: string,
    public readonly tags: string[],
    public baseUrl: string,
    public readonly createdAt: number,
    public updatedAt: number,
    public folderPath?: string
  ) {}
}

export default ApiServiceEntity;
