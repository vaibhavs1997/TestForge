// Project Context service functions
import axios from 'axios';
import type { ProjectContext } from '../types';

const API_BASE = '/api';

export const projectContextService = {
  getProjectContext: async (projectId: string): Promise<ProjectContext> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/context`);
    return data.data;
  },
};

export default projectContextService;