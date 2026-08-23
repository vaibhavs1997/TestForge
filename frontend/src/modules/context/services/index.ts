// Project Context service functions
import type { ProjectContext } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

export const projectContextService = {
  getProjectContext: async (projectId: string): Promise<ProjectContext> => {
    return apiRequest.get<ProjectContext>(`${API_BASE_URL}/projects/${projectId}/context`);
  },
};

export default projectContextService;
