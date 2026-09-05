import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AIProviderEntity } from '../../domain/ai-provider/index.js';
import { FileAIProviderRepository } from './AIProviderRepository.js';

function provider(id: string, projectId: string, type: 'Ollama' | 'Groq'): AIProviderEntity {
  return new AIProviderEntity(
    id,
    projectId,
    type,
    type,
    type === 'Ollama' ? 'llama3.2' : 'llama-3.3-70b-versatile',
    null,
    type === 'Groq' ? 'groq-test-key' : null,
    null,
    0.7,
    1,
    2048,
    30000,
    true,
    false,
    Date.now(),
    Date.now(),
  );
}

describe('FileAIProviderRepository', () => {
  let directory: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    directory = mkdtempSync(join(tmpdir(), 'testforge-ai-providers-'));
    process.chdir(directory);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(directory, { recursive: true, force: true });
  });

  it('encrypts credentials on creation and migrates legacy plaintext without losing settings', async () => {
    const repository = new FileAIProviderRepository();
    const item = provider('groq-1', 'project-1', 'Groq');
    const file = join(directory, 'data', 'ai-providers', 'project-1', 'providers.json');
    await repository.create(item);
    expect(readFileSync(file, 'utf8')).not.toContain('groq-test-key');
    expect(readFileSync(join(directory, 'data/runtime/secrets.enc.json'), 'utf8')).not.toContain('groq-test-key');
    expect((await repository.findById(item.id))?.apiKey).toBe('groq-test-key');
    await repository.update(item.id, { timeout: 1234 });
    expect((await repository.findById(item.id))?.apiKey).toBe('groq-test-key');
    mkdirSync(join(directory, 'data/ai-providers/legacy'), {recursive:true});
    const legacy = provider('legacy-1', 'legacy', 'Groq');
    writeFileSync(join(directory, 'data/ai-providers/legacy/providers.json'), JSON.stringify([legacy]));
    await repository.migrateSecrets();
    expect((await repository.findById(legacy.id))?.apiKey).toBe('groq-test-key');
    expect(readFileSync(join(directory, 'data/ai-providers/legacy/providers.json'), 'utf8')).not.toContain('groq-test-key');
  });

  it('keeps providers when concurrent project mutations occur', async () => {
    const repository = new FileAIProviderRepository();
    const ollama = provider('ollama-1', 'project-1', 'Ollama');
    const groq = provider('groq-1', 'project-1', 'Groq');

    await repository.create(ollama);
    await Promise.all([
      repository.update(ollama.id, { timeout: 3000 }),
      repository.create(groq),
    ]);

    const providers = await repository.findByProject('project-1');
    expect(providers.map((item) => item.provider)).toEqual(['Ollama', 'Groq']);
    expect(providers.find((item) => item.id === ollama.id)?.timeout).toBe(3000);
  });
});
