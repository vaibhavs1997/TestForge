// AI Provider hooks
import { useState, useEffect, useCallback } from 'react';
import { aiProviderService } from '../services';
import type {
  AIProvider,
  AIProviderType,
  AIProviderHealth,
  AIProviderEstimate,
  AIProviderMessage,
  AIProviderGenerateResult,
  AIProviderAdapterInfo,
} from '../types';

export function useAIProviders(projectId: string | null) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiProviderService.listProviders(projectId);
      setProviders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch AI providers');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, error, refetch: fetchProviders };
}

export function useAIProviderTypes() {
  const [types, setTypes] = useState<AIProviderType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiProviderService.listSupportedTypes();
      setTypes(data);
    } catch {
      // Fallback to known types
      setTypes(['OpenAI', 'Claude', 'Gemini', 'Ollama', 'Azure OpenAI', 'AWS Bedrock', 'Custom']);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return { types, loading, refetch: fetchTypes };
}

export function useAIProviderAdapters() {
  const [adapters, setAdapters] = useState<AIProviderAdapterInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAdapters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiProviderService.listAdapters();
      setAdapters(data);
    } catch {
      // Fallback to known adapters
      setAdapters([
        { type: 'OpenAI', category: 'OpenAI' },
        { type: 'Claude', category: 'Claude' },
        { type: 'Gemini', category: 'Gemini' },
        { type: 'Ollama', category: 'Ollama' },
        { type: 'Azure OpenAI', category: 'Azure OpenAI' },
        { type: 'AWS Bedrock', category: 'AWS Bedrock' },
        { type: 'Custom', category: 'Custom' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdapters();
  }, [fetchAdapters]);

  return { adapters, loading, refetch: fetchAdapters };
}

export function useAIProviderHealth(projectId: string | null, providerId: string | null) {
  const [health, setHealth] = useState<AIProviderHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!projectId || !providerId) return;
    setLoading(true);
    try {
      const data = await aiProviderService.testProvider(projectId, providerId);
      setHealth(data);
    } catch (err: any) {
      setHealth({ healthy: false, message: err.message || 'Failed to test connection' });
    } finally {
      setLoading(false);
    }
  }, [projectId, providerId]);

  return { health, loading, checkHealth };
}

export function useAIProviderEstimate(projectId: string | null, providerId: string | null) {
  const [estimate, setEstimate] = useState<AIProviderEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  const estimateProvider = useCallback(
    async (messages: AIProviderMessage[], maxTokens?: number) => {
      if (!projectId || !providerId) return;
      setLoading(true);
      try {
        const data = await aiProviderService.estimateProvider(projectId, providerId, messages, maxTokens);
        setEstimate(data);
      } catch {
        setEstimate(null);
      } finally {
        setLoading(false);
      }
    },
    [projectId, providerId]
  );

  return { estimate, loading, estimateProvider };
}

export function useAIProviderGenerate(projectId: string | null, providerId: string | null) {
  const [result, setResult] = useState<AIProviderGenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      messages: AIProviderMessage[],
      options?: { maxTokens?: number; temperature?: number; topP?: number; stop?: string[] }
    ) => {
      if (!projectId || !providerId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await aiProviderService.generateProvider(projectId, providerId, messages, options);
        setResult(data);
      } catch (err: any) {
        setError(err.message || 'Failed to generate response');
      } finally {
        setLoading(false);
      }
    },
    [projectId, providerId]
  );

  return { result, loading, error, generate };
}