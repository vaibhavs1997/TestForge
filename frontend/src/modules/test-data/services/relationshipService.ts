// Relationship service functions for Dataset Relationships

import axios from 'axios';
import type { Relationship, CreateRelationshipInput } from '../types/relationship';
import { API_BASE_URL } from '../../../constants/api';

export const relationshipService = {
  listByProject: async (projectId: string): Promise<Relationship[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/relationships`);
    return data.data;
  },

  listByDataset: async (projectId: string, datasetId: string): Promise<Relationship[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/datasets/${datasetId}/relationships`);
    return data.data;
  },

  create: async (projectId: string, input: CreateRelationshipInput): Promise<Relationship> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/relationships`, input);
    return data.data;
  },

  update: async (projectId: string, relationshipId: string, updates: Partial<CreateRelationshipInput>): Promise<Relationship> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/relationships/${relationshipId}`, updates);
    return data.data;
  },

  delete: async (projectId: string, relationshipId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/relationships/${relationshipId}`);
  },
};

export default relationshipService;