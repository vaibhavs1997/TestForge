// Recommendation service functions
import axios from 'axios';
import type { Recommendation } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const recommendationService = {
  async analyzeProject(projectId: string): Promise<Recommendation[]> {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/analyze`);
    return data.data;
  },
};

export default recommendationService;
