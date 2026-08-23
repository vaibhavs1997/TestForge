export type AiCapability = 'GENERAL_REASONING' | 'STRUCTURED_GENERATION' | 'REQUIREMENT_ANALYSIS' | 'TEST_CASE_GENERATION' | 'FAILURE_ANALYSIS' | 'COVERAGE_ANALYSIS' | 'DEPENDENCY_SUGGESTION';
export type AiErrorCategory = 'AI_DISABLED' | 'PROVIDER_UNAVAILABLE' | 'MODEL_UNAVAILABLE' | 'TIMEOUT' | 'RATE_LIMITED' | 'INVALID_STRUCTURED_OUTPUT' | 'GOVERNANCE_BLOCKED' | 'CONTEXT_TOO_LARGE' | 'PROVIDER_FAILURE';
export interface AiModelMetadata { providerId: string; modelId: string; modelVersion?: string; configFingerprint?: string; contextLimit?: number; outputTokenLimit?: number; supportsStructuredOutput: boolean; supportsTools: boolean; supportsStreaming: boolean; supportsVision?: boolean; }
export interface AiGenerationRequest { capability: AiCapability; systemInstructions?: string; input: unknown; structuredSchema?: AiStructuredSchema; timeoutMs?: number; temperature?: number; maxOutputTokens?: number; correlationId?: string; sensitivity?: 'PUBLIC' | 'REDACT_REQUIRED' | 'LOCAL_ONLY'; }
export interface AiGenerationResult<T = unknown> { output: T; provider: string; model: string; durationMs: number; retryCount: number; fallbackUsed: boolean; finishStatus: 'COMPLETED' | 'STOPPED'; usage?: { inputTokens?: number; outputTokens?: number }; }
export interface AiStructuredSchema { validate(value: unknown): { valid: true; value: unknown } | { valid: false; errors: string[] }; }
export interface ChatModelProvider { readonly metadata: AiModelMetadata; invoke(request: AiGenerationRequest, options?: { signal?: AbortSignal }): Promise<AiGenerationResult>; }
export interface StructuredAiGenerator { generate<T>(request: AiGenerationRequest, schema: AiStructuredSchema): Promise<AiGenerationResult<T>>; }
export interface AiInvocationPolicy { decide(request: AiGenerationRequest, model: AiModelMetadata): { allowed: boolean; redact: boolean; reason?: AiErrorCategory }; }
export interface AiModelResolver { resolve(input: { capability: AiCapability; preferred?: { providerId: string; modelId: string }; fallback?: AiFallbackPolicy }): ChatModelProvider; }
export interface AiFallbackPolicy { mode: 'NONE' | 'ON_UNAVAILABLE_TIMEOUT_RATE_LIMIT'; allowExternalFallback: boolean; }
export interface AiInvocationTelemetry { capability: AiCapability; provider: string; model: string; durationMs: number; success: boolean; retryCount: number; fallbackUsed: boolean; correlationId?: string; error?: AiErrorCategory; }
export class AiCapabilityError extends Error { constructor(public readonly category: AiErrorCategory, message: string) { super(message); } }
