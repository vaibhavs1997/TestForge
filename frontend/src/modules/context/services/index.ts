// Project Context service functions
import axios from 'axios';
import type { ProjectContext } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const projectContextService = {
  getProjectContext: async (projectId: string): Promise<ProjectContext> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/context`);
    return data.data;
  },
};

export default projectContextService;