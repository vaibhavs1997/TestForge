// Analysis service functions for AI Project Analysis
import axios from 'axios';
import type { AnalysisCard } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const analysisService = {
  listAnalysis: async (projectId: string): Promise<AnalysisCard[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/analysis`);
    return data.data;
  },

  getAnalysis: async (projectId: string, analysisId: string): Promise<AnalysisCard> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/analysis/${analysisId}`);
    return data.data;
  },

  createAnalysis: async (projectId: string, payload: {
    title: string;
    description?: string;
    category?: string;
    confidence?: number;
    relatedOperations?: string[];
    relatedFlows?: string[];
    relatedDatasets?: string[];
    relatedRuntimeVariables?: string[];
    status?: string;
  }): Promise<AnalysisCard> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/analysis`, payload);
    return data.data;
  },

  updateAnalysis: async (projectId: string, analysisId: string, payload: {
    title?: string;
    description?: string;
    category?: string;
    confidence?: number;
    relatedOperations?: string[];
    relatedFlows?: string[];
    relatedDatasets?: string[];
    relatedRuntimeVariables?: string[];
    status?: string;
  }): Promise<AnalysisCard> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/analysis/${analysisId}`, payload);
    return data.data;
  },

  deleteAnalysis: async (projectId: string, analysisId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/analysis/${analysisId}`);
  },

  runAnalysis: async (projectId: string): Promise<AnalysisCard[]> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/analysis/run`);
    return data.data;
  },
};

export default analysisService;