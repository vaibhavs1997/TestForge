// Type definitions for Api domain

export interface ApiOperation {
  id: string;
  method: string;
  path: string;
  name: string;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  baseUrl: string;
  operations: ApiOperation[];
}
