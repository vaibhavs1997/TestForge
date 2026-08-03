// Relationship service functions for Dataset Relationships

import axios from 'axios';
import type { Relationship, CreateRelationshipInput } from '../types/relationship';

const API_BASE = '/api';

export const relationshipService = {
  listByProject: async (projectId: string): Promise<Relationship[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/relationships`);
    return data.data;
  },

  listByDataset: async (projectId: string, datasetId: string): Promise<Relationship[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/datasets/${datasetId}/relationships`);
    return data.data;
  },

  create: async (projectId: string, input: CreateRelationshipInput): Promise<Relationship> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/relationships`, input);
    return data.data;
  },

  update: async (projectId: string, relationshipId: string, updates: Partial<CreateRelationshipInput>): Promise<Relationship> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/relationships/${relationshipId}`, updates);
    return data.data;
  },

  delete: async (projectId: string, relationshipId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/relationships/${relationshipId}`);
  },
};

export default relationshipService;