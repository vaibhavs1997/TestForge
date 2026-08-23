import type { AiGenerationRequest, AiGenerationResult, AiModelMetadata, ChatModelProvider } from '../../domain/ai/index.js';
export class FakeChatModelProvider implements ChatModelProvider {
  readonly metadata: AiModelMetadata = { providerId: 'test-provider', modelId: 'test-model', supportsStructuredOutput: true, supportsTools: false, supportsStreaming: false };
  constructor(private readonly output: unknown) {}
  async invoke(_request: AiGenerationRequest): Promise<AiGenerationResult> { return { output: this.output, provider: this.metadata.providerId, model: this.metadata.modelId, durationMs: 1, retryCount: 0, fallbackUsed: false, finishStatus: 'COMPLETED' }; }
}
