// Knowledge service functions for the AI Knowledge Hub
import axios from 'axios';
import type { KnowledgeFlow, KnowledgeFlowFormData } from '../types';

const API_BASE = '/api';

export const knowledgeService = {
  listFlows: async (projectId: string): Promise<KnowledgeFlow[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/knowledge/flows`);
    return data.data;
  },

  getFlow: async (projectId: string, flowId: string): Promise<KnowledgeFlow> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/knowledge/flows/${flowId}`);
    return data.data;
  },

  createFlow: async (projectId: string, payload: Omit<KnowledgeFlowFormData, 'id' | 'projectId'>): Promise<KnowledgeFlow> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/knowledge/flows`, payload);
    return data.data;
  },

  updateFlow: async (projectId: string, flowId: string, payload: Partial<KnowledgeFlowFormData>): Promise<KnowledgeFlow> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/knowledge/flows/${flowId}`, payload);
    return data.data;
  },

  deleteFlow: async (projectId: string, flowId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/knowledge/flows/${flowId}`);
  },
};

export default knowledgeService;