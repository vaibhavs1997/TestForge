/** Jira Cloud / Server credentials from repository root `.env`. */

export interface JiraEnvConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export function getJiraEnvConfig(env: NodeJS.ProcessEnv = process.env): JiraEnvConfig | null {
  const baseUrl = env.JIRA_BASE_URL?.trim().replace(/\/+$/, '');
  const email = env.JIRA_EMAIL?.trim();
  const apiToken = env.JIRA_API_TOKEN?.trim();

  if (!baseUrl || !email || !apiToken) {
    return null;
  }

  return { baseUrl, email, apiToken };
}

export function isJiraConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getJiraEnvConfig(env) !== null;
}
