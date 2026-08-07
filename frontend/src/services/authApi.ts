import { httpClient } from './HttpClient';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: string;
}

export interface AuthConfigResponse {
  loginRequired: boolean;
  registerAllowed: boolean;
  authEnabled: boolean;
}

export interface MeResponse {
  authenticated: boolean;
  subject: string;
  email?: string;
  displayName?: string;
  tenantId?: string;
  role?: string;
  projectIds?: string[] | '*';
  loginRequired?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}

export const authApi = {
  getConfig: () => httpClient.get<AuthConfigResponse>('/auth/config'),

  me: () => httpClient.get<MeResponse>('/me'),

  login: (email: string, password: string) =>
    httpClient.post<LoginResponse>('/auth/login', { email, password }),

  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => httpClient.post<LoginResponse>('/auth/register', input),
};

export default authApi;
