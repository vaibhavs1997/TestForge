/**
 * Produces a safe copy for persistence, logging, exports, and integrations.
 * It deliberately never mutates its input, so outbound API-test requests keep
 * their original payload and credentials.
 */
export class SensitiveDataRedactionService {
  static readonly replacement = '[REDACTED]';
  private static readonly sensitiveKey = /(password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|jwt|bearer|credential|private[_-]?key)/i;
  private customRules: RegExp[] = [];

  configureSensitiveFields(rules: Array<string | RegExp>): void {
    this.customRules = rules.map((rule) => typeof rule === 'string' ? new RegExp(rule, 'i') : rule);
  }

  redact<T>(value: T): T {
    return this.redactValue(value, new WeakMap()) as T;
  }

  redactKnownValues<T>(value: T, values: string[]): T {
    const unique = values.filter(Boolean).sort((a, b) => b.length - a.length);
    if (!unique.length) return value;
    return this.replaceKnown(value, unique, new WeakMap()) as T;
  }

  private redactValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
    if (typeof value === 'string') {
      return value
        .replace(/\bBearer\s+[^\s,;]+/gi, `Bearer ${SensitiveDataRedactionService.replacement}`)
        .replace(/\b(authorization|api[_-]?key|token|secret|password)\s*[=:]\s*[^\s,;]+/gi, `$1=${SensitiveDataRedactionService.replacement}`);
    }
    if (Array.isArray(value)) return value.map((item) => this.redactValue(item, seen));
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const copy: Record<string, unknown> = {};
    seen.set(value, copy);
    for (const [key, child] of Object.entries(value)) {
      copy[key] = (SensitiveDataRedactionService.sensitiveKey.test(key) || this.customRules.some((rule) => rule.test(key)))
        ? SensitiveDataRedactionService.replacement
        : this.redactValue(child, seen);
    }
    return copy;
  }

  private replaceKnown(value: unknown, values: string[], seen: WeakMap<object, unknown>): unknown {
    if (typeof value === 'string') return values.reduce((text, secret) => text.split(secret).join(SensitiveDataRedactionService.replacement), value);
    if (Array.isArray(value)) return value.map((item) => this.replaceKnown(item, values, seen));
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const copy: Record<string, unknown> = {}; seen.set(value, copy);
    for (const [key, child] of Object.entries(value)) copy[key] = this.replaceKnown(child, values, seen);
    return copy;
  }
}

export const sensitiveDataRedactor = new SensitiveDataRedactionService();
export default sensitiveDataRedactor;
