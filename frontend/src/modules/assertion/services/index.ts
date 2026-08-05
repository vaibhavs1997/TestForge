// Assertion services

import axios from 'axios';
import type { Assertion, AssertionFormData } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const assertionService = {
  async createAssertion(projectId: string, data: AssertionFormData): Promise<Assertion> {
    const { data: response } = await axios.post(
      `${API_BASE_URL}/projects/${projectId}/assertions`,
      data
    );
    return response.data;
  },

  async updateAssertion(projectId: string, id: string, data: Partial<AssertionFormData>): Promise<Assertion> {
    const { data: response } = await axios.put(
      `${API_BASE_URL}/projects/${projectId}/assertions/${id}`,
      data
    );
    return response.data;
  },

  async deleteAssertion(projectId: string, id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/assertions/${id}`);
  },

  async getAssertion(projectId: string, id: string): Promise<Assertion> {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/assertions/${id}`);
    return data.data;
  },

  async listAssertions(projectId: string): Promise<Assertion[]> {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/assertions`);
    return data.data;
  },

  async searchAssertions(projectId: string, query: string): Promise<Assertion[]> {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/assertions/search`, {
      params: { q: query }
    });
    return data.data;
  },

  async toggleAssertion(projectId: string, id: string, enabled: boolean): Promise<Assertion> {
    const { data: response } = await axios.patch(
      `${API_BASE_URL}/projects/${projectId}/assertions/${id}/toggle`,
      { enabled }
    );
    return response.data;
  },

  async duplicateAssertion(projectId: string, id: string): Promise<Assertion> {
    const { data: response } = await axios.post(
      `${API_BASE_URL}/projects/${projectId}/assertions/${id}/duplicate`
    );
    return response.data;
  },
};

export default assertionService;