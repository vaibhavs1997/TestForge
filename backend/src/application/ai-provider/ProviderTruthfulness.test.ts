import { describe, expect, it, vi } from 'vitest';
import { AIProviderRegistry } from './AIProviderRegistry.js';
import { AIProviderResolutionService } from './AIProviderResolutionService.js';
import { AIProviderEntity } from '../../domain/ai-provider/index.js';
import { secureHttpExecutor } from '../../infrastructure/http/SecureHttpExecutor.js';
const entity = (provider: any) => new AIProviderEntity('p', 'project', 'Provider', provider, 'model', null, 'secret-key', null, 0.2, 1, 10, 1000, true, false, 1, 1);
describe('provider truthfulness', () => {
  it('classifies live, local, simulated, and unavailable adapters', () => { const r = new AIProviderRegistry(); expect(r.resolve('OpenAI').capability).toBe('LIVE'); expect(r.resolve('Ollama').capability).toBe('LOCAL'); expect(r.resolve('Claude').capability).toBe('SIMULATED'); expect(r.resolve('Custom').capability).toBe('UNAVAILABLE'); });
  it('blocks simulated providers outside development/test override', async () => { const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production'; delete process.env.ALLOW_SIMULATED_AI; await expect(new AIProviderResolutionService(new AIProviderRegistry()).generate(entity('Claude'), [])).rejects.toThrow('simulated'); process.env.NODE_ENV = previous; });
  it('permits simulated providers only with explicit override', async () => { const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production'; process.env.ALLOW_SIMULATED_AI = 'true'; await expect(new AIProviderResolutionService(new AIProviderRegistry()).generate(entity('Claude'), [])).resolves.toMatchObject({ providerType: 'Claude' }); delete process.env.ALLOW_SIMULATED_AI; process.env.NODE_ENV = previous; });
  it('sanitizes health errors', async () => { vi.spyOn(secureHttpExecutor, 'execute').mockRejectedValue(new Error('Incorrect API key provided: secret-key.')); const result = await new AIProviderResolutionService(new AIProviderRegistry()).health(entity('OpenAI')); expect(JSON.stringify(result)).not.toContain('secret-key'); });
});
