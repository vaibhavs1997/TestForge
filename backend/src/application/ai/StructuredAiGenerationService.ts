import type { AiGenerationRequest, AiGenerationResult, AiInvocationPolicy, AiModelResolver, AiStructuredSchema, StructuredAiGenerator } from '../../domain/ai/index.js';
import { AiCapabilityError } from '../../domain/ai/index.js';
import { sensitiveDataRedactor } from '../../infrastructure/security/SensitiveDataRedactionService.js';

/** Provider-neutral application proof; adapters are supplied only through the resolver. */
export class StructuredAiGenerationService implements StructuredAiGenerator {
  constructor(private readonly resolver: AiModelResolver, private readonly policy: AiInvocationPolicy) {}
  async generate<T>(request: AiGenerationRequest, schema: AiStructuredSchema): Promise<AiGenerationResult<T>> {
    const provider = this.resolver.resolve({ capability: request.capability });
    const decision = this.policy.decide(request, provider.metadata);
    if (!decision.allowed) throw new AiCapabilityError(decision.reason ?? 'GOVERNANCE_BLOCKED', 'AI invocation is blocked by governance policy.');
    const safeRequest = decision.redact ? { ...request, input: sensitiveDataRedactor.redact(request.input) } : request;
    const result = await provider.invoke(safeRequest);
    const validated = schema.validate(result.output);
    if (!validated.valid) throw new AiCapabilityError('INVALID_STRUCTURED_OUTPUT', 'AI returned output that does not match the required schema.');
    return { ...result, output: validated.value as T };
  }
}
