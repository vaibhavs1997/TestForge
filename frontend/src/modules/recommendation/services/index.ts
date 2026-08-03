// Recommendation service functions
import axios from 'axios';
import type { Recommendation } from '../types';

const API_BASE = '/api';

export const recommendationService = {
  async analyzeProject(projectId: string): Promise<Recommendation[]> {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/analyze`);
    return data.data;
  },
};

export default recommendationService;
