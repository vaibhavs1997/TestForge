export interface SecretReference { secretRef: string; }
export interface SecretMetadata { id: string; projectId: string; createdAt: number; updatedAt: number; version: number; classification?: string; }
export interface SecretStore {
  get(reference: SecretReference | string): Promise<string | null>;
  set(input: { id: string; projectId: string; value: string; classification?: string }): Promise<SecretMetadata>;
  update(reference: SecretReference | string, value: string): Promise<SecretMetadata>;
  delete(reference: SecretReference | string): Promise<void>;
  metadata(reference: SecretReference | string): Promise<SecretMetadata | null>;
}

export function isSecretReference(value: unknown): value is SecretReference {
  return Boolean(value) && typeof value === 'object' && typeof (value as SecretReference).secretRef === 'string';
}
