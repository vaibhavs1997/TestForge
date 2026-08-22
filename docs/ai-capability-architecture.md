# AI capability architecture

External providers supply infrastructure. **TestForge owns AI capabilities and QA intelligence.**

Application services use `ChatModelProvider`, `StructuredAiGenerator`, `AiModelResolver`, and `AiInvocationPolicy`. Embeddings remain separate through `EmbeddingProvider`. Future layers may add infrastructure adapters (including LangChain) and then controlled generation or agents; provider SDK types must not cross into domain/application code.
