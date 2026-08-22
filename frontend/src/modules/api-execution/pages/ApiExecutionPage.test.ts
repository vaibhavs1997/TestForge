import { describe, expect, it } from 'vitest';
import { applyCanonicalTemporaryOverrides, isHydratedForProject, requestHeadersToRecord, resolveUrl, rowsToRecord } from './ApiExecutionPage';

function draftFixture() {
  return {
    pathParams: [{ id: 'path', enabled: true, key: 'id', value: 'old-path', description: '' }],
    queryParams: [{ id: 'query', enabled: true, key: 'id', value: 'old-query', description: '' }],
    headers: [{ id: 'header', name: 'id', value: 'old-header' }],
    rawBody: JSON.stringify({ id: 'old-body', nested: { code: 'old-code' } }),
    formDataRows: [],
    urlEncodedRows: [],
    graphqlVariables: JSON.stringify({ id: 'old-variable' }),
  } as any;
}

describe('API workspace project hydration', () => {
  it('does not treat a previous project snapshot as hydrated for a new project', () => {
    expect(isHydratedForProject('project-with-old-contract', 'new-project')).toBe(false);
  });

  it('allows persistence only after the current project snapshot is hydrated', () => {
    expect(isHydratedForProject('new-project', 'new-project')).toBe(true);
  });
});

describe('canonical temporary request overrides', () => {
  it('applies body and GraphQL variable overrides without changing the input draft', () => {
    const draft = draftFixture();
    const result = applyCanonicalTemporaryOverrides(draft, {
      'op|BODY|nested.code': 'new-code',
      'op|GRAPHQL_VARIABLE|id': 'new-variable',
    });

    expect(JSON.parse(result.rawBody)).toMatchObject({ nested: { code: 'new-code' } });
    expect(JSON.parse(result.graphqlVariables)).toMatchObject({ id: 'new-variable' });
    expect(JSON.parse(draft.rawBody)).toMatchObject({ nested: { code: 'old-code' } });
  });

  it('applies query, path, header and cookie overrides through their canonical locations', () => {
    const result = applyCanonicalTemporaryOverrides(draftFixture(), {
      'op|QUERY|id': 'query-value',
      'op|PATH|id': 'path-value',
      'op|HEADER|id': 'header-value',
      'op|COOKIE|session': 'cookie-value',
    });

    expect(result.queryParams[0].value).toBe('query-value');
    expect(result.pathParams[0].value).toBe('path-value');
    expect(result.headers.find((header: any) => header.name === 'id')?.value).toBe('header-value');
    expect(result.headers.find((header: any) => header.name === 'Cookie')?.value).toContain('session=cookie-value');
  });

  it('keeps same-named inputs separate and leaves overrides transient', () => {
    const draft = draftFixture();
    const result = applyCanonicalTemporaryOverrides(draft, {
      'op|BODY|id': 'body-value',
      'op|QUERY|id': 'query-value',
      'op|HEADER|id': 'header-value',
    });

    expect(JSON.parse(result.rawBody).id).toBe('body-value');
    expect(result.queryParams[0].value).toBe('query-value');
    expect(result.headers[0].value).toBe('header-value');
    expect(JSON.parse(draft.rawBody).id).toBe('old-body');
    expect(draft.queryParams[0].value).toBe('old-query');
    expect(draft.headers[0].value).toBe('old-header');
  });

  it('passes every location to the outbound request builders with its final override value', () => {
    const result = applyCanonicalTemporaryOverrides(draftFixture(), {
      'op|BODY|id': 'body-value',
      'op|QUERY|id': 'query-value',
      'op|PATH|id': 'path-value',
      'op|HEADER|id': 'header-value',
      'op|COOKIE|session': 'cookie-value',
      'op|GRAPHQL_VARIABLE|id': 'variable-value',
    });

    expect(resolveUrl('https://example.test/users/{id}', rowsToRecord(result.pathParams), rowsToRecord(result.queryParams), {}))
      .toBe('https://example.test/users/path-value?id=query-value');
    expect(requestHeadersToRecord(result.headers)).toMatchObject({ id: 'header-value', Cookie: 'session=cookie-value' });
    expect(JSON.parse(result.rawBody).id).toBe('body-value');
    expect(JSON.parse(result.graphqlVariables).id).toBe('variable-value');
  });
});
