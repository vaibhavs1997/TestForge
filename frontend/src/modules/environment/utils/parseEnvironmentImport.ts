import { load as loadYaml } from 'js-yaml';

export interface ParsedEnvironmentImport {
  name: string;
  baseUrl: string;
  description?: string;
  variables: Record<string, string>;
  timeout?: number;
}

const BASE_URL_KEY_HINTS = [
  'baseurl',
  'base_url',
  'url',
  'host',
  'api_url',
  'apiurl',
  'issuer',
  'domain',
  'server',
  'endpoint',
  'apihost',
];

function stripUtf8Bom(text: string): string {
  return text.replace(/^\uFEFF/, '');
}

function looksLikeJson(text: string): boolean {
  const trimmed = stripUtf8Bom(text).trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function looksLikeYaml(text: string): boolean {
  const trimmed = stripUtf8Bom(text).trim();
  if (trimmed.startsWith('---')) return true;
  if (looksLikeJson(trimmed)) return false;
  return /^\s*[\w."'-]+\s*:\s*/m.test(trimmed);
}

function looksLikeDotEnv(text: string, fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.env') || lower.endsWith('.env.local')) return true;
  if (looksLikeJson(text)) return false;
  const trimmed = stripUtf8Bom(text).trim();
  return /^[A-Za-z_][A-Za-z0-9_.-]*\s*=/m.test(trimmed);
}

function firstHttpUrlInValues(variables: Record<string, string>): string {
  for (const value of Object.values(variables)) {
    const v = value.trim();
    if (/^https?:\/\//i.test(v)) {
      return v.replace(/\/$/, '');
    }
    const match = v.match(/https?:\/\/[^\s"'<>]+/i);
    if (match) {
      return match[0].replace(/\/$/, '');
    }
  }
  return '';
}

export function resolveEnvironmentBaseUrl(variables: Record<string, string>, explicit?: string): string {
  const trimmed = explicit?.trim();
  if (trimmed) {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replace(/\/$/, '');
    }
    return `https://${trimmed.replace(/\/$/, '')}`;
  }

  for (const hint of BASE_URL_KEY_HINTS) {
    for (const [varKey, value] of Object.entries(variables)) {
      if (!value?.trim()) continue;
      const keyLower = varKey.toLowerCase();
      if (keyLower === hint || keyLower.includes(hint)) {
        const v = value.trim();
        if (/^https?:\/\//i.test(v)) return v.replace(/\/$/, '');
        if (!v.includes(' ') && !v.includes('{{')) {
          return `https://${v.replace(/\/$/, '')}`;
        }
      }
    }
  }

  return firstHttpUrlInValues(variables);
}

function postmanValuesToRecord(values: unknown): Record<string, string> {
  const record: Record<string, string> = {};
  if (!Array.isArray(values)) return record;
  for (const entry of values) {
    if (!entry || typeof entry !== 'object') continue;
    const key = String((entry as { key?: unknown }).key ?? '').trim();
    if (!key) continue;
    const enabled = (entry as { enabled?: boolean }).enabled;
    if (enabled === false) continue;
    record[key] = String((entry as { value?: unknown }).value ?? '');
  }
  return record;
}

function isPostmanEnvironmentExport(raw: Record<string, unknown>): boolean {
  if (raw._postman_variable_scope === 'environment') return true;
  if (Array.isArray(raw.values) && raw.values.length > 0) {
    const first = raw.values[0];
    return Boolean(first && typeof first === 'object' && 'key' in (first as object));
  }
  return false;
}

function normalizeOne(raw: Record<string, unknown>, fallbackName: string): ParsedEnvironmentImport | null {
  const name = String(raw.name ?? raw.id ?? fallbackName).trim();
  if (!name) return null;

  let variables: Record<string, string> = {};
  if (raw.values) {
    variables = postmanValuesToRecord(raw.values);
  } else if (raw.variables && typeof raw.variables === 'object' && !Array.isArray(raw.variables)) {
    variables = Object.fromEntries(
      Object.entries(raw.variables as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]),
    );
  }

  let baseUrl = resolveEnvironmentBaseUrl(variables, typeof raw.baseUrl === 'string' ? raw.baseUrl : undefined);
  let description = typeof raw.description === 'string' ? raw.description : undefined;

  if (!baseUrl && isPostmanEnvironmentExport(raw)) {
    baseUrl = 'https://127.0.0.1';
    description = description
      ? `${description} (No URL variable in Postman export — update Base URL if needed.)`
      : 'Imported from Postman. No URL variable was found — update Base URL if needed.';
  }

  if (!baseUrl) {
    return null;
  }

  const timeout =
    typeof raw.timeout === 'number' && raw.timeout > 0 ? raw.timeout : undefined;

  return {
    name,
    baseUrl,
    description,
    variables,
    timeout,
  };
}

function parseYamlEnvironments(text: string, fallbackName: string): ParsedEnvironmentImport[] {
  let parsed: unknown;
  try {
    parsed = loadYaml(stripUtf8Bom(text));
  } catch (e) {
    throw new Error(
      e instanceof Error ? `Invalid YAML: ${e.message}` : 'The file is not valid YAML.',
    );
  }
  return parseJsonEnvironments(JSON.stringify(parsed), fallbackName);
}

function parseJsonEnvironments(text: string, fallbackName: string): ParsedEnvironmentImport[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripUtf8Bom(text));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(
        'The file is not valid JSON. If this is a Postman environment export, re-export it from Postman or paste the raw .json file.',
      );
    }
    throw e;
  }

  const results: ParsedEnvironmentImport[] = [];

  if (Array.isArray(parsed)) {
    parsed.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const env = normalizeOne(item as Record<string, unknown>, `${fallbackName} ${index + 1}`);
        if (env) results.push(env);
      }
    });
    return results;
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.environments)) {
      return parseJsonEnvironments(JSON.stringify(obj.environments), fallbackName);
    }
    const displayName =
      typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : fallbackName;
    const single = normalizeOne(obj, displayName);
    if (single) results.push(single);
  }

  return results;
}

function parseDotEnv(text: string, fallbackName: string): ParsedEnvironmentImport[] {
  const variables: Record<string, string> = {};
  for (const line of stripUtf8Bom(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    variables[key] = value;
  }
  const baseUrl = resolveEnvironmentBaseUrl(variables);
  if (!baseUrl) {
    throw new Error(
      'No base URL found in this .env file. Add BASE_URL, URL, or another variable with an https:// value.',
    );
  }
  const name =
    fallbackName.replace(/\.env(\.local)?$/i, '').trim() || 'Imported Environment';
  return [{ name, baseUrl, variables }];
}

function deriveFallbackName(fileName: string, parsedJsonName?: string): string {
  if (parsedJsonName?.trim()) return parsedJsonName.trim();
  let name = fileName;
  name = name.replace(/\.postman_environment\.json$/i, '');
  name = name.replace(/\.json$/i, '');
  name = name.replace(/\.(yaml|yml|env)$/i, '');
  return name.trim() || 'Imported Environment';
}

export async function parseEnvironmentImport(
  input: { file: File; format?: string } | { url: string; format?: string },
): Promise<ParsedEnvironmentImport[]> {
  let text: string;
  let fileName = '';

  if ('file' in input) {
    text = await input.file.text();
    fileName = input.file.name;
  } else {
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch environment (${response.status})`);
    }
    text = await response.text();
    try {
      fileName = new URL(input.url).pathname.split('/').pop() || '';
    } catch {
      fileName = '';
    }
  }

  text = stripUtf8Bom(text);
  const userFormat = (input.format ?? '').toLowerCase();
  const lowerName = fileName.toLowerCase();

  const useYaml =
    userFormat === 'yaml'
    || (
      userFormat !== 'json'
      && userFormat !== 'env'
      && (lowerName.endsWith('.yaml') || lowerName.endsWith('.yml') || looksLikeYaml(text))
    );

  if (useYaml) {
    const fallbackName = deriveFallbackName(fileName);
    const envs = parseYamlEnvironments(text, fallbackName);
    if (envs.length === 0) {
      throw new Error(
        'The file is valid YAML but no importable environment was found. Include name, variables, or Postman-style values.',
      );
    }
    return envs;
  }

  const preferDotEnv =
    userFormat === 'env' || (userFormat !== 'json' && userFormat !== 'yaml' && looksLikeDotEnv(text, fileName));

  if (preferDotEnv && !looksLikeJson(text)) {
    return parseDotEnv(text, deriveFallbackName(fileName));
  }

  if (looksLikeJson(text)) {
    let jsonName: string | undefined;
    try {
      const peek = JSON.parse(text) as Record<string, unknown>;
      if (peek && typeof peek.name === 'string') jsonName = peek.name;
    } catch {
      /* parseJsonEnvironments will report */
    }
    const fallbackName = deriveFallbackName(fileName, jsonName);
    const envs = parseJsonEnvironments(text, fallbackName);
    if (envs.length === 0) {
      const isPostman = fileName.toLowerCase().includes('postman_environment');
      throw new Error(
        isPostman
          ? 'This Postman environment file was read successfully, but no variable looks like a base URL. Add a variable (e.g. baseUrl, url, issuer) whose value starts with https://.'
          : 'The file is valid JSON but no importable environment was found. Each environment needs a name and a base URL (field or variable such as baseUrl / url / issuer with an https:// value).',
      );
    }
    return envs;
  }

  if (userFormat === 'env' || looksLikeDotEnv(text, fileName)) {
    return parseDotEnv(text, deriveFallbackName(fileName));
  }

  if (userFormat === 'json') {
    throw new Error(
      'The file is not valid JSON. Choose Auto-detect or the correct format, or fix the file contents.',
    );
  }

  throw new Error(
    'Unrecognized environment file. Supported: Postman environment JSON, JSON, YAML, or .env key=value files. Use Auto-detect unless you need to override.',
  );
}
