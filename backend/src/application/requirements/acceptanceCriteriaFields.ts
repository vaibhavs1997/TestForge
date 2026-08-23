/** Known field aliases detected in acceptance criteria or API samples. */
const FIELD_HINTS: { id: string; label: string; patterns: RegExp[] }[] = [
  { id: 'email', label: 'email', patterns: [/\be-?mail\b/i, /\bemail address\b/i] },
  { id: 'password', label: 'password', patterns: [/\bpassword\b/i, /\bpassphrase\b/i] },
  { id: 'username', label: 'username', patterns: [/\buser\s*name\b/i, /\blogin\s*id\b/i] },
  { id: 'phone', label: 'phone number', patterns: [/\bphone\b/i, /\bmobile\b/i, /\btelephone\b/i] },
  { id: 'firstName', label: 'first name', patterns: [/\bfirst\s*name\b/i, /\bgiven\s*name\b/i] },
  { id: 'lastName', label: 'last name', patterns: [/\blast\s*name\b/i, /\bsurname\b/i, /\bfamily\s*name\b/i] },
  { id: 'country', label: 'country', patterns: [/\bcountry\b/i] },
  { id: 'region', label: 'region', patterns: [/\bregion\b/i, /\bmarket\b/i] },
  { id: 'postalCode', label: 'postal code', patterns: [/\bpostal\s*code\b/i, /\bzip\s*code\b/i] },
  { id: 'dateOfBirth', label: 'date of birth', patterns: [/\bdate of birth\b/i, /\bdob\b/i, /\bbirth\s*date\b/i] },
];

const FLOW_DEFAULT_FIELDS: Record<string, string[]> = {
  account: ['email', 'password'],
  auth: ['email', 'password'],
};

/** When OpenAPI has no `required` array, treat these body keys as mandatory if present in the sample. */
const CORE_MANDATORY_BODY_FIELDS = ['email', 'password', 'username'];

export interface AcceptanceFieldContext {
  /** Mandatory fields — used for missing-field and validation scenarios. */
  requiredFieldLabels: string[];
  requiredFieldIds: string[];
  contextPhrase?: string;
}

function labelForId(id: string): string {
  return FIELD_HINTS.find((f) => f.id === id)?.label ?? id.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
}

export function normalizeApiFieldKey(key: string): string | null {
  const k = key.toLowerCase();
  if (k.includes('email')) return 'email';
  if (k.includes('password') || k === 'pass') return 'password';
  if (k.includes('username') || k === 'user') return 'username';
  if (k.includes('phone') || k.includes('mobile')) return 'phone';
  if (k.includes('firstname') || k === 'fname') return 'firstName';
  if (k.includes('lastname') || k === 'lname') return 'lastName';
  if (k.includes('country')) return 'country';
  if (k.includes('region') || k.includes('market')) return 'region';
  if (k.includes('postal') || k.includes('zip')) return 'postalCode';
  if (k.includes('birth') || k === 'dob') return 'dateOfBirth';
  return null;
}

function detectMentionedFieldIds(acText: string): string[] {
  const found: string[] = [];
  for (const hint of FIELD_HINTS) {
    if (hint.patterns.some((p) => p.test(acText))) {
      found.push(hint.id);
    }
  }
  return found;
}

function extractContextPhrase(acText: string): string | undefined {
  // Capture product, market, or platform context without maintaining a
  // contract-specific allowlist (for example, a particular brand or site).
  const context = acText.match(/\b(?:on|in|for|within|from)\s+([a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*){0,5})/i);
  if (context && !/account|user|system/i.test(context[1])) return context[1].trim();
  return undefined;
}

export function formatFieldList(labels: string[]): string {
  const unique = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  if (unique.length === 0) return 'required fields';
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`;
}

export interface InferFieldsOptions {
  flowKind?: 'account' | 'auth' | 'generic';
  /** OpenAPI schema `required` property names (mandatory only). */
  apiRequiredBodyKeys?: string[];
  /** All sample body keys — used only to infer core mandatory fields when `required` is absent. */
  apiBodyKeys?: string[];
}

export function inferFieldsFromAcceptanceCriteria(
  acText: string,
  options: InferFieldsOptions = {},
): AcceptanceFieldContext {
  const mentioned = detectMentionedFieldIds(acText);

  const mandatoryFromApi = (options.apiRequiredBodyKeys ?? [])
    .map(normalizeApiFieldKey)
    .filter((id): id is string => Boolean(id));

  let mandatoryIds: string[];

  if (mandatoryFromApi.length > 0) {
    mandatoryIds = [...new Set(mandatoryFromApi)];
  } else if (options.apiBodyKeys?.length) {
    const fromSample = options.apiBodyKeys
      .map(normalizeApiFieldKey)
      .filter((id): id is string => Boolean(id));
    const core = fromSample.filter((id) => CORE_MANDATORY_BODY_FIELDS.includes(id));
    mandatoryIds = core.length > 0 ? [...new Set(core)] : [];
  } else {
    mandatoryIds = [];
  }

  if (mandatoryIds.length === 0) {
    mandatoryIds = [...new Set(mentioned)];
  }

  if (mandatoryIds.length === 0 && options.flowKind && FLOW_DEFAULT_FIELDS[options.flowKind]) {
    mandatoryIds = [...FLOW_DEFAULT_FIELDS[options.flowKind]];
  }

  if (mandatoryIds.length === 0 && options.flowKind === 'account') {
    mandatoryIds = ['email', 'password'];
  }

  if (mandatoryIds.length === 0 && /required|mandatory|must provide|must include/i.test(acText)) {
    mandatoryIds = ['email', 'password'];
  }

  const requiredFieldIds = [...new Set(mandatoryIds)];
  const requiredFieldLabels = requiredFieldIds.map(labelForId);

  return {
    requiredFieldIds,
    requiredFieldLabels,
    contextPhrase: extractContextPhrase(acText),
  };
}
