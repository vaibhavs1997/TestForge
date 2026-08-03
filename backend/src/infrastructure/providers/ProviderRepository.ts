// ProviderRepository - File-based repository implementation for Provider Framework
// Persists providers to data/providers/{projectId}/providers.json
import * as fs from 'fs';
import * as path from 'path';
import { ProviderEntity } from '../../domain/providers/ProviderEntity';

// Mask credentials when persisting to disk
const SECRET_KEYS = ['apiKey', 'apiSecret', 'token', 'password', 'authToken', 'secret', 'accountSid'];

function maskCredentials(credentials: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string' && SECRET_KEYS.some(secret => key.toLowerCase().includes(secret))) {
      masked[key] = value.length > 4 ? `${value.substring(0, 4)}****` : '****';
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

const DATA_ROOT = path.join(process.cwd(), 'data', 'providers');

export class ProviderRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getProvidersFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'providers.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(provider: ProviderEntity): Promise<ProviderEntity> {
    this.ensureProjectDir(provider.projectId);
    const filePath = this.getProvidersFilePath(provider.projectId);
    const items = await this.readProviders(provider.projectId);
    items.push(provider);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return provider;
  }

  async findById(id: string): Promise<ProviderEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readProviders(projectId);
      const provider = items.find(p => p.id === id);
      if (provider) return provider;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ProviderEntity[]> {
    return this.readProviders(projectId);
  }

  async findByProjectAndCategory(projectId: string, category: string): Promise<ProviderEntity[]> {
    const items = await this.readProviders(projectId);
    return items.filter(p => p.category === category);
  }

  async findDefault(projectId: string): Promise<ProviderEntity | null> {
    const items = await this.readProviders(projectId);
    return items.find(p => p.projectId === projectId && p.isDefault && p.enabled) || null;
  }

  async list(): Promise<ProviderEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: ProviderEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readProviders(projectId);
      allItems.push(...items);
    }
    return allItems;
  }

  async update(id: string, updates: Partial<ProviderEntity>): Promise<ProviderEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getProvidersFilePath(projectId);
      const items = await this.readProviders(projectId);
      const index = items.findIndex(p => p.id === id);
      if (index !== -1) {
        // If setting this provider as default, unset others in the same project
        const updated = { ...items[index], ...updates };
        if (updates.isDefault === true) {
          items.forEach((p, i) => {
            if (i !== index) {
              items[i] = { ...p, isDefault: false };
            }
          });
        }
        items[index] = updated;
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getProvidersFilePath(projectId);
      const items = await this.readProviders(projectId);
      const filtered = items.filter(p => p.id !== id);
      if (filtered.length !== items.length) {
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readProviders(projectId: string): ProviderEntity[] {
    const filePath = this.getProvidersFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    const raw = JSON.parse(data);
    // Mask credentials on read to protect secrets
    return raw.map((p: any) => ({
      ...p,
      credentials: p.credentials ? maskCredentials(p.credentials) : {},
    }));
  }
}

export default ProviderRepository;