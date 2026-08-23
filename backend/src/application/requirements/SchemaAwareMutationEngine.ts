import type { Assertion, MutationProvenance, RequestOverride } from '../../domain/requirements/TestDesignEntity.js';

type Schema = Record<string, any>;
type Location = MutationProvenance['location'];
const copy = <T>(v: T): T => v === undefined ? v : JSON.parse(JSON.stringify(v));

export interface GeneratedMutationCase {
  title: string;
  requestOverrides: RequestOverride & { pathParams?: Record<string, unknown>; cookies?: Record<string, unknown> };
  assertions: Assertion[];
  provenance: MutationProvenance;
}

/** Bounded, deterministic OpenAPI/GraphQL mutation engine; independent of AI. */
export class SchemaAwareMutationEngine {
  generateOpenApi(operation: Schema, maxCases = 32): GeneratedMutationCase[] {
    const bodySchema = this.bodySchema(operation);
    const base: any = { body: bodySchema ? this.baseline(bodySchema) : undefined, queryParams: {}, headers: {}, pathParams: {}, cookies: {} };
    for (const p of operation.parameters || []) {
      const target = this.target(base, p.in); if (target) target[p.name] = this.baseline(p.schema || {});
    }
    const out = [this.make('Baseline valid request', base, this.provenance('baseline-valid', 'body', '$', 'valid schema', null, null), operation, true)];
    if (bodySchema) this.walk(bodySchema, base, [], '$', 'body', operation, out, maxCases, false);
    for (const p of operation.parameters || []) this.parameter(p, base, operation, out, maxCases);
    return this.unique(out, maxCases);
  }

  generateGraphQLVariables(variables: Record<string, Schema>, maxCases = 32): GeneratedMutationCase[] {
    const base: any = { body: { variables: Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, this.baseline(v)])) } };
    const out = [this.make('Baseline valid GraphQL variables', base, this.provenance('baseline-valid', 'graphql-variable', '$.variables', 'valid schema', null, null), {}, true)];
    for (const [name, schema] of Object.entries(variables)) this.walk(schema, base, ['variables', name], `$.variables.${name}`, 'graphql-variable', {}, out, maxCases, true);
    return this.unique(out, maxCases);
  }

  deriveAssertions(operation: Schema, valid: boolean): Assertion[] {
    const codes = Object.keys(operation.responses || {});
    const documented = codes.find((x) => valid ? /^2\d\d$/.test(x) : /^[45]\d\d$/.test(x));
    return documented ? [{ type: 'status', operator: 'equals', path: '$.status', expected: Number(documented) }]
      : [{ type: 'status', operator: 'matches', path: '$.status', expected: valid ? '^2\\d\\d$' : '^[45]\\d\\d$' }];
  }

  private bodySchema(operation: Schema): Schema | null { const content = operation.requestBody?.content || {}; return content['application/json']?.schema || content[Object.keys(content)[0]]?.schema || null; }
  private target(base: any, location: string): any { return location === 'query' ? base.queryParams : location === 'header' ? base.headers : location === 'path' ? base.pathParams : location === 'cookie' ? base.cookies : null; }
  private location(location: string): Location | null { return location === 'query' || location === 'path' || location === 'header' || location === 'cookie' ? location : null; }

  private baseline(schema: Schema): any {
    if (schema.example !== undefined) return copy(schema.example); if (schema.default !== undefined) return copy(schema.default); if (schema.enum?.length) return copy(schema.enum[0]);
    if (schema.allOf) return schema.allOf.reduce((a: any, b: Schema) => ({ ...a, ...this.baseline(b) }), {});
    if (schema.oneOf?.length) return this.baseline(schema.oneOf[0]); if (schema.anyOf?.length) return this.baseline(schema.anyOf[0]);
    const type = Array.isArray(schema.type) ? schema.type.find((x: string) => x !== 'null') : schema.type;
    if (type === 'object' || schema.properties) { const out: any = {}; const required = new Set(schema.required || []); for (const [k, v] of Object.entries(schema.properties || {})) if (required.has(k) || (v as any).default !== undefined) out[k] = this.baseline(v as Schema); return out; }
    if (type === 'array') return Array.from({ length: Math.max(1, schema.minItems || 0) }, () => this.baseline(schema.items || {}));
    if (type === 'number' || type === 'integer') return schema.minimum ?? (typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum + 1 : 1);
    if (type === 'boolean') return true; if (schema.format === 'email') return 'user@example.test'; if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000001';
    return 'a'.repeat(Math.max(1, schema.minLength || 1));
  }

  private walk(schema: Schema, base: any, path: string[], display: string, location: Location, operation: Schema, out: GeneratedMutationCase[], max: number, required: boolean): void {
    if (out.length >= max) return; const original = this.get(base.body, path);
    for (const mutation of this.mutations(schema, original, location, display, required)) {
      if (out.length >= max) return; const next = copy(base); if (mutation.remove) this.remove(next.body, path); else this.set(next.body, path, mutation.value); out.push(this.make(`${mutation.p.strategy}: ${display}`, next, mutation.p, operation));
    }
    const effective = this.objectSchema(schema); const requiredKeys = new Set(effective.required || []); for (const [key, child] of Object.entries(effective.properties || {})) this.walk(child as Schema, base, [...path, key], `${display}.${key}`, location, operation, out, max, requiredKeys.has(key));
  }

  private parameter(p: Schema, base: any, operation: Schema, out: GeneratedMutationCase[], max: number): void {
    const loc = this.location(p.in); if (!loc) return; const original = this.target(base, loc)[p.name];
    for (const mutation of this.mutations(p.schema || {}, original, loc, `${loc}.${p.name}`, Boolean(p.required))) {
      if (out.length >= max) return; const next = copy(base); const target = this.target(next, loc); if (mutation.remove) delete target[p.name]; else target[p.name] = mutation.value; out.push(this.make(`${mutation.p.strategy}: ${loc}.${p.name}`, next, mutation.p, operation));
    }
  }

  private mutations(schema: Schema, original: any, location: Location, fieldPath: string, required: boolean): Array<{ value?: any; remove?: boolean; p: MutationProvenance }> {
    const out: any[] = []; const add = (strategy: MutationProvenance['strategy'], rule: string, value?: any, remove = false) => out.push({ value, remove, p: this.provenance(strategy, location, fieldPath, rule, original, remove ? undefined : value) });
    if (required) add('required-field', 'required', undefined, true); if (schema.nullable || schema.type?.includes?.('null')) add('boundary', 'nullable', null); if (schema.enum?.length) add('enum-violation', 'enum', '__invalid_enum__');
    const type = Array.isArray(schema.type) ? schema.type.find((x: string) => x !== 'null') : schema.type;
    if (type === 'number' || type === 'integer') { if (schema.minimum !== undefined) add('boundary', 'minimum', schema.minimum - 1); if (schema.maximum !== undefined) add('boundary', 'maximum', schema.maximum + 1); if (typeof schema.exclusiveMinimum === 'number') add('boundary', 'exclusiveMinimum', schema.exclusiveMinimum); if (typeof schema.exclusiveMaximum === 'number') add('boundary', 'exclusiveMaximum', schema.exclusiveMaximum); add('type-violation', 'type', 'not-a-number'); }
    else if (type === 'array') { if (schema.minItems !== undefined) add('array-boundary', 'minItems', Array(Math.max(0, schema.minItems - 1)).fill(this.baseline(schema.items || {}))); if (schema.maxItems !== undefined) add('array-boundary', 'maxItems', Array(schema.maxItems + 1).fill(this.baseline(schema.items || {}))); add('type-violation', 'type', {}); }
    else { if (schema.minLength !== undefined) add('boundary', 'minLength', 'a'.repeat(Math.max(0, schema.minLength - 1))); if (schema.maxLength !== undefined) add('boundary', 'maxLength', 'a'.repeat(schema.maxLength + 1)); if (schema.pattern) add('format-violation', 'pattern', 'invalid-pattern'); if (schema.format) add('format-violation', `format:${schema.format}`, `invalid-${schema.format}`); add('type-violation', 'type', 12345); }
    if (schema.oneOf || schema.anyOf || schema.allOf) add('schema-composition', schema.oneOf ? 'oneOf' : schema.anyOf ? 'anyOf' : 'allOf', true);
    return out;
  }

  private make(title: string, base: any, provenance: MutationProvenance, operation: Schema, valid = false): GeneratedMutationCase { const { pathParams, cookies, ...overrides } = base; return { title, requestOverrides: { ...overrides, pathParams, cookies }, assertions: this.deriveAssertions(operation, valid), provenance }; }
  private provenance(strategy: MutationProvenance['strategy'], location: Location, fieldPath: string, schemaRule: string, originalValue: any, mutatedValue: any): MutationProvenance { return { strategy, location, fieldPath, schemaRule, originalValue: copy(originalValue), mutatedValue: copy(mutatedValue) }; }
  private unique(input: GeneratedMutationCase[], max: number): GeneratedMutationCase[] { const seen = new Set<string>(); return input.filter((item) => { const key = JSON.stringify({ r: item.requestOverrides, p: item.provenance }); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, max); }
  private objectSchema(schema: Schema): Schema { return schema.allOf ? schema.allOf.reduce((a: any, b: any) => ({ ...a, properties: { ...(a.properties || {}), ...(b.properties || {}) } }), { ...schema, properties: {} }) : schema; }
  private get(obj: any, path: string[]): any { return path.reduce((a, k) => a?.[k], obj); }
  private set(obj: any, path: string[], value: any): void { if (!path.length) return; let target = obj; for (const k of path.slice(0, -1)) target = target[k] ?? (target[k] = {}); target[path[path.length - 1]] = value; }
  private remove(obj: any, path: string[]): void { const parent = this.get(obj, path.slice(0, -1)); if (parent && path.length) delete parent[path[path.length - 1]]; }
}

export default SchemaAwareMutationEngine;
