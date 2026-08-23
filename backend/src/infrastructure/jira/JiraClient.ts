import { getJiraEnvConfig, type JiraEnvConfig } from '../../config/jiraEnv.js';

export interface JiraIssueFields {
  summary: string;
  descriptionPlain: string;
}

export class JiraClient {
  private readonly config: JiraEnvConfig;

  constructor(config?: JiraEnvConfig | null) {
    const resolved = config ?? getJiraEnvConfig();
    if (!resolved) {
      throw new Error('Jira is not configured. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN in .env');
    }
    this.config = resolved;
  }

  static isConfigured(): boolean {
    return getJiraEnvConfig() !== null;
  }

  private authHeader(): string {
    const token = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return `Basic ${token}`;
  }

  async getIssue(issueKey: string): Promise<JiraIssueFields> {
    const key = issueKey.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key)) {
      throw new Error(`Invalid Jira issue key: ${issueKey}`);
    }

    const url = `${this.config.baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader(),
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Jira API error (${response.status}): ${text.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      fields?: { summary?: string; description?: unknown };
    };

    const summary = String(data.fields?.summary ?? key);
    const descriptionPlain = adfToPlainText(data.fields?.description);

    return { summary, descriptionPlain };
  }

  async addComment(issueKey: string, plainText: string): Promise<void> {
    const key = issueKey.trim().toUpperCase();
    const url = `${this.config.baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}/comment`;
    const body = {
      body: plainTextToAdfDocument(plainText),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Jira comment failed (${response.status}): ${text.slice(0, 300)}`);
    }
  }
}

function adfToPlainText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return String(node);

  const doc = node as { type?: string; text?: string; content?: unknown[] };
  if (doc.type === 'text' && doc.text) return doc.text;
  if (!Array.isArray(doc.content)) return '';

  const parts: string[] = [];
  for (const child of doc.content) {
    const text = adfToPlainText(child);
    if (text) parts.push(text);
    if ((child as { type?: string }).type === 'paragraph') parts.push('\n');
  }
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function plainTextToAdfDocument(text: string): Record<string, unknown> {
  const paragraphs = text.split(/\n/).map((line) => ({
    type: 'paragraph',
    content: line.trim()
      ? [{ type: 'text', text: line }]
      : [],
  }));

  return {
    type: 'doc',
    version: 1,
    content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph', content: [{ type: 'text', text: text || ' ' }] }],
  };
}

export default JiraClient;
