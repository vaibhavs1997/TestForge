// Prompt Builder hooks
import { useState, useEffect, useCallback } from 'react';
import { promptService } from '../services';
import type { PromptTemplate, Prompt, BuiltPrompt, BuildPromptRequest, PreviewPromptRequest } from '../types';

export function useTemplates(projectId: string | null) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await promptService.listTemplates(projectId);
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, refetch: fetchTemplates };
}

export function usePrompts(projectId: string | null) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await promptService.listPrompts(projectId);
      setPrompts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return { prompts, loading, error, refetch: fetchPrompts };
}

export function usePromptBuilder(projectId: string | null) {
  const [preview, setPreview] = useState<BuiltPrompt | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const previewPrompt = useCallback(
    async (request: PreviewPromptRequest) => {
      if (!projectId) return;
      setBuilding(true);
      setBuildError(null);
      try {
        const data = await promptService.previewPrompt(projectId, request);
        setPreview(data);
      } catch (err: any) {
        setBuildError(err.message || 'Failed to preview prompt');
      } finally {
      setBuilding(false);
      }
    },
    [projectId]
  );

  const buildPrompt = useCallback(
    async (request: BuildPromptRequest): Promise<Prompt | null> => {
      if (!projectId) return null;
      setBuilding(true);
      setBuildError(null);
      try {
        const data = await promptService.buildPrompt(projectId, request);
        return data;
      } catch (err: any) {
        setBuildError(err.message || 'Failed to build prompt');
        return null;
      } finally {
        setBuilding(false);
      }
    },
    [projectId]
  );

  return { preview, building, buildError, previewPrompt, buildPrompt };
}
