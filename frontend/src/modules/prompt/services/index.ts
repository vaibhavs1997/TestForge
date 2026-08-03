// Prompt Builder service functions
import axios from 'axios';
import type { PromptTemplate, Prompt, BuiltPrompt, PreviewPromptRequest, BuildPromptRequest } from '../types';

const API_BASE = '/api';

export const promptService = {
  // GET /api/projects/:projectId/prompts/templates
  listTemplates: async (projectId: string): Promise<PromptTemplate[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/prompts/templates`);
    return data.data;
  },

  // GET /api/projects/:projectId/prompts
  listPrompts: async (projectId: string): Promise<Prompt[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/prompts`);
    return data.data;
  },

  // GET /api/projects/:projectId/prompts/:promptId
  getPrompt: async (projectId: string, promptId: string): Promise<Prompt> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/prompts/${promptId}`);
    return data.data;
  },

  // POST /api/projects/:projectId/prompts/preview
  previewPrompt: async (projectId: string, request: PreviewPromptRequest): Promise<BuiltPrompt> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/prompts/preview`, request);
    return data.data;
  },

  // POST /api/projects/:projectId/prompts/build
  buildPrompt: async (projectId: string, request: BuildPromptRequest): Promise<Prompt> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/prompts/build`, request);
    return data.data;
  },

  // DELETE /api/projects/:projectId/prompts/:promptId
  deletePrompt: async (projectId: string, promptId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/prompts/${promptId}`);
  },
};

export default promptService;
