// Prompt Builder service functions
import type { PromptTemplate, Prompt, BuiltPrompt, PreviewPromptRequest, BuildPromptRequest } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

export const promptService = {
  // GET /api/projects/:projectId/prompts/templates
  listTemplates: async (projectId: string): Promise<PromptTemplate[]> => {
    return apiRequest.get<PromptTemplate[]>(`${API_BASE_URL}/projects/${projectId}/prompts/templates`);
  },

  // GET /api/projects/:projectId/prompts
  listPrompts: async (projectId: string): Promise<Prompt[]> => {
    return apiRequest.get<Prompt[]>(`${API_BASE_URL}/projects/${projectId}/prompts`);
  },

  // GET /api/projects/:projectId/prompts/:promptId
  getPrompt: async (projectId: string, promptId: string): Promise<Prompt> => {
    return apiRequest.get<Prompt>(`${API_BASE_URL}/projects/${projectId}/prompts/${promptId}`);
  },

  // POST /api/projects/:projectId/prompts/preview
  previewPrompt: async (projectId: string, request: PreviewPromptRequest): Promise<BuiltPrompt> => {
    return apiRequest.post<BuiltPrompt>(`${API_BASE_URL}/projects/${projectId}/prompts/preview`, request);
  },

  // POST /api/projects/:projectId/prompts/build
  buildPrompt: async (projectId: string, request: BuildPromptRequest): Promise<Prompt> => {
    return apiRequest.post<Prompt>(`${API_BASE_URL}/projects/${projectId}/prompts/build`, request);
  },

  // DELETE /api/projects/:projectId/prompts/:promptId
  deletePrompt: async (projectId: string, promptId: string): Promise<void> => {
    await apiRequest.delete(`${API_BASE_URL}/projects/${projectId}/prompts/${promptId}`);
  },
};

export default promptService;
