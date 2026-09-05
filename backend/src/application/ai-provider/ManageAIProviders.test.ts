import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManageAIProviders } from './ManageAIProviders.js';
import { AIProviderRegistry } from './AIProviderRegistry.js';
import { AIProviderResolutionService } from './AIProviderResolutionService.js';

describe('ManageAIProviders', () => {
  const previousOllamaBaseUrl = process.env.OLLAMA_BASE_URL;

  afterEach(() => {
    if (previousOllamaBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = previousOllamaBaseUrl;
  });

  it('does not create an Ollama provider from environment configuration', async () => {
    process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
    const repository = {
      findByProject: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    } as any;
    const service = new ManageAIProviders(
      repository,
      new AIProviderRegistry(),
      new AIProviderResolutionService(new AIProviderRegistry()),
    );

    await expect(service.listByProject('project-1')).resolves.toEqual([]);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
