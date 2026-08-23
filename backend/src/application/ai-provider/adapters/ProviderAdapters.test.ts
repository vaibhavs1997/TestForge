import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { OpenAIAdapter } from './ProviderAdapters.js';
import type { AIProviderConfig } from '../../../domain/ai-provider/index.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError: (error: unknown) => Boolean(error && typeof error === 'object' && 'response' in error),
  },
}));

const config: AIProviderConfig = {
  name: 'Test OpenAI',
  provider: 'OpenAI',
  model: 'gpt-4o',
  endpoint: 'https://api.openai.com/v1',
  apiKey: 'test-key',
  organization: 'org-test',
  temperature: 0.2,
  topP: 1,
  maxTokens: 128,
  timeout: 5000,
  enabled: true,
  default: true,
  projectId: 'project-1',
};

describe('OpenAIAdapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires an API key', () => {
    const errors = new OpenAIAdapter().validateConfiguration({ ...config, apiKey: undefined });
    expect(errors).toContain('API key is required for OpenAI.');
  });

  it('performs a real-model health check', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { id: 'gpt-4o' } });

    const result = await new OpenAIAdapter().health(config);

    expect(result.healthy).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models/gpt-4o',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
  });

  it('generates content from the chat completion response', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        model: 'gpt-4o-2024-08-06',
        choices: [{ message: { content: '{"cases":[]}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 12, completion_tokens: 8 },
      },
    });

    const result = await new OpenAIAdapter().generate(config, [
      { role: 'user', content: 'Generate API test cases.' },
    ]);

    expect(result.content).toBe('{"cases":[]}');
    expect(result.model).toBe('gpt-4o-2024-08-06');
    expect(result.usage).toEqual({ promptTokens: 12, completionTokens: 8, totalTokens: 20 });
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ model: 'gpt-4o', max_tokens: 128 }),
      expect.objectContaining({ timeout: 5000 }),
    );
  });
});
