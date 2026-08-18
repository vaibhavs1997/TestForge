// ApiOperationEntity - Domain Entity for API Operation

export class ApiOperationEntity {
  /** Example request JSON from OpenAPI / Postman import, used for scenario payloads. */
  sampleRequestBody: Record<string, unknown> | null = null;
  /** OpenAPI request body schema `required` property names (mandatory fields only). */
  requiredRequestBodyFields: string[] | null = null;
  /** Fully resolved executable request URL when the importer can determine it. */
  requestUrl: string | null = null;
  /** Imported operation tags, preserved from the source contract. */
  tags: string[] = [];
  /** Content types observed on the imported request body. */
  contentTypes: string[] = [];
  /** Raw/resolved source operation snapshot preserved from import. */
  sourceOperation: Record<string, unknown> | null = null;

  constructor(
    public readonly id: string,
    public readonly projectId: string,
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
