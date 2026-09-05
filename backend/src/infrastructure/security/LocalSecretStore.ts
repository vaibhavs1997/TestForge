import { readJsonArray, updateJsonArray } from '../persistence/JsonFileStore.js';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SecretMetadata, SecretReference, SecretStore } from '../../domain/security/SecretStore.js';

type Record = SecretMetadata & { cipherText: string; iv: string; tag: string };
const idOf = (reference: SecretReference | string) => typeof reference === 'string' ? reference : reference.secretRef;

/**
 * Single-node secret store. Development can create a local key, while deployment
 * environments require an externally supplied key so a restart cannot silently
 * make previously stored secrets unreadable.
 */
export class LocalSecretStore implements SecretStore {
  private readonly root = join(process.cwd(), 'data', 'runtime');
  private readonly file = join(this.root, 'secrets.enc.json');
  private readonly keyFile = join(this.root, 'secret-store.key');
  async get(reference: SecretReference | string): Promise<string | null> { const item = (await this.read()).find((entry) => entry.id === idOf(reference)); if (!item) return null; const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(item.iv, 'base64')); decipher.setAuthTag(Buffer.from(item.tag, 'base64')); return Buffer.concat([decipher.update(Buffer.from(item.cipherText, 'base64')), decipher.final()]).toString('utf8'); }
  async set(input: { id: string; projectId: string; value: string; classification?: string }): Promise<SecretMetadata> {
    const now = Date.now();
    const metadata: SecretMetadata = { id: input.id, projectId: input.projectId, createdAt: now, updatedAt: now, version: 1, classification: input.classification };
    await updateJsonArray<Record>(this.file, [], entries => {
      if (entries.some(entry => entry.id === input.id)) throw new Error('Secret already exists');
      return [...entries, { ...metadata, ...this.encrypt(input.value) }];
    });
    return metadata;
  }
  async update(reference: SecretReference | string, value: string): Promise<SecretMetadata> {
    let metadata: SecretMetadata | undefined;
    await updateJsonArray<Record>(this.file, [], entries => {
      const item = entries.find(entry => entry.id === idOf(reference));
      if (!item) throw new Error('Secret not found');
      Object.assign(item, this.encrypt(value), { updatedAt: Date.now(), version: item.version + 1 });
      metadata = this.meta(item);
      return entries;
    });
    return metadata!;
  }
  async delete(reference: SecretReference | string): Promise<void> { await updateJsonArray<Record>(this.file, [], entries => entries.filter(entry => entry.id !== idOf(reference))); }
  async metadata(reference: SecretReference | string): Promise<SecretMetadata | null> { const item = (await this.read()).find((entry) => entry.id === idOf(reference)); return item ? this.meta(item) : null; }
  private encrypt(value: string) { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key(), iv); const cipherText = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return { cipherText: cipherText.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }; }
  private key(): Buffer {
    const configured = process.env.TESTFORGE_SECRET_STORE_KEY?.trim();
    if (configured) {
      const key = Buffer.from(configured, 'base64');
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(configured) || key.length !== 32) {
        throw new Error('TESTFORGE_SECRET_STORE_KEY must be a base64-encoded 32-byte key.');
      }
      return key;
    }
    const deploymentEnvironment = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (deploymentEnvironment) {
      throw new Error('TESTFORGE_SECRET_STORE_KEY is required in staging/production and is never generated automatically.');
    }
    this.ensure();
    if (!existsSync(this.keyFile)) {
      try { writeFileSync(this.keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    }
    return readFileSync(this.keyFile);
  }
  private read(): Promise<Record[]> { return readJsonArray<Record>(this.file); }
  private ensure() { if (!existsSync(this.root)) mkdirSync(this.root, { recursive: true }); }
  private meta(item: Record): SecretMetadata { const { cipherText, iv, tag, ...metadata } = item; return metadata; }
}
