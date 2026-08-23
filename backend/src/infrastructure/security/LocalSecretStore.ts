import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SecretMetadata, SecretReference, SecretStore } from '../../domain/security/SecretStore.js';

type Record = SecretMetadata & { cipherText: string; iv: string; tag: string };
const idOf = (reference: SecretReference | string) => typeof reference === 'string' ? reference : reference.secretRef;

/** Local development store: encrypted-at-rest with a local 0600 key. Replace with KMS/Vault in production. */
export class LocalSecretStore implements SecretStore {
  private readonly root = join(process.cwd(), 'data', 'runtime');
  private readonly file = join(this.root, 'secrets.enc.json');
  private readonly keyFile = join(this.root, 'secret-store.key');
  async get(reference: SecretReference | string): Promise<string | null> { const item = this.read().find((entry) => entry.id === idOf(reference)); if (!item) return null; const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(item.iv, 'base64')); decipher.setAuthTag(Buffer.from(item.tag, 'base64')); return Buffer.concat([decipher.update(Buffer.from(item.cipherText, 'base64')), decipher.final()]).toString('utf8'); }
  async set(input: { id: string; projectId: string; value: string; classification?: string }): Promise<SecretMetadata> { const entries = this.read(); if (entries.some((entry) => entry.id === input.id)) throw new Error(`Secret ${input.id} already exists`); const now = Date.now(); const metadata: SecretMetadata = { id: input.id, projectId: input.projectId, createdAt: now, updatedAt: now, version: 1, classification: input.classification }; entries.push({ ...metadata, ...this.encrypt(input.value) }); this.write(entries); return metadata; }
  async update(reference: SecretReference | string, value: string): Promise<SecretMetadata> { const entries = this.read(); const item = entries.find((entry) => entry.id === idOf(reference)); if (!item) throw new Error(`Secret ${idOf(reference)} not found`); Object.assign(item, this.encrypt(value), { updatedAt: Date.now(), version: item.version + 1 }); this.write(entries); return this.meta(item); }
  async delete(reference: SecretReference | string): Promise<void> { this.write(this.read().filter((entry) => entry.id !== idOf(reference))); }
  async metadata(reference: SecretReference | string): Promise<SecretMetadata | null> { const item = this.read().find((entry) => entry.id === idOf(reference)); return item ? this.meta(item) : null; }
  private encrypt(value: string) { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key(), iv); const cipherText = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return { cipherText: cipherText.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }; }
  private key() { this.ensure(); if (!existsSync(this.keyFile)) writeFileSync(this.keyFile, randomBytes(32), { mode: 0o600 }); return readFileSync(this.keyFile); }
  private read(): Record[] { this.ensure(); if (!existsSync(this.file)) return []; return JSON.parse(readFileSync(this.file, 'utf8')) as Record[]; }
  private write(entries: Record[]) { this.ensure(); writeFileSync(this.file, JSON.stringify(entries, null, 2), { mode: 0o600 }); }
  private ensure() { if (!existsSync(this.root)) mkdirSync(this.root, { recursive: true }); }
  private meta(item: Record): SecretMetadata { const { cipherText, iv, tag, ...metadata } = item; return metadata; }
}
