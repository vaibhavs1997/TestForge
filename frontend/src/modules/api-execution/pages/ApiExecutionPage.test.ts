import { describe, expect, it } from 'vitest';
import { applyCanonicalTemporaryOverrides, applyPostmanBodyTemplate, extractOAuthTokenResponse, flattenBodyFields, getOAuthTokenState, isHydratedForProject, isUsableOAuthToken, normalizeDuplicatedBaseUrlTemplate, requestEditorUrl, requestHeadersToRecord, resolveUrl, rowsToRecord, savedEditorTemplate, sourceOperationWithSavedEditor, withPendingEnvironmentToken } from './ApiExecutionPage';

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
  it('removes an unresolved duplicate base URL template from imported operation URLs', () => {
    expect(normalizeDuplicatedBaseUrlTemplate('https://u-api.example.test/{{ident_base_url}}/auth/signup'))
      .toBe('https://u-api.example.test/auth/signup');
    expect(normalizeDuplicatedBaseUrlTemplate('https://u-api.example.test/auth/{{userId}}'))
      .toBe('https://u-api.example.test/auth/{{userId}}');
  });

  it('uses the original Postman URL template until an environment resolves it', () => {
    expect(requestEditorUrl({
      requestUrl: 'https://api.example.test/uup/v1/auth/login',
      sourceOperation: { raw: { requestUrlTemplate: '{{identity_base_url}}/auth/login' } },
    }, '/auth/login')).toBe('{{identity_base_url}}/auth/login');
  });

  it('does not treat a previous project snapshot as hydrated for a new project', () => {
    expect(isHydratedForProject('project-with-old-contract', 'new-project')).toBe(false);
  });

  it('allows persistence only after the current project snapshot is hydrated', () => {
    expect(isHydratedForProject('new-project', 'new-project')).toBe(true);
  });

  it('keeps a complete saved editor template with the existing contract metadata', () => {
    const template = { url: 'https://api.example.test/users', method: 'POST', headers: [{ name: 'Accept', value: 'application/json' }], rawBody: '{"name":"Ada"}' } as any;
    const source = sourceOperationWithSavedEditor({ raw: { requestHeaders: [{ name: 'Accept', value: 'application/json' }], responses: { 200: {} } } }, template);

    expect(source).toMatchObject({ rawOperation: { requestHeaders: [{ name: 'Accept' }] }, requestEditor: template });
    expect(savedEditorTemplate({ raw: source })).toEqual(template);
  });
});

describe('OAuth token status', () => {
  it('does not treat a masked reference or template as an active token', () => {
    expect(isUsableOAuthToken('{{accessToken}}')).toBe(false);
    expect(isUsableOAuthToken('[REDACTED]')).toBe(false);
    expect(getOAuthTokenState('bearer', false, true, 0, Date.now())).toBe('Token reference configured');
    expect(getOAuthTokenState('bearer', false, false, 0, Date.now())).toBe('Missing token');
  });

  it('marks a real, unexpired token active and no-auth requests not required', () => {
    expect(isUsableOAuthToken('Bearer actual-token')).toBe(true);
    expect(getOAuthTokenState('bearer', true, false, Date.now() + 60_000, Date.now())).toBe('Active');
    expect(getOAuthTokenState('none', false, true, 0, Date.now())).toBe('Not required');
  });

  it('keeps a just-saved token available for the current editor session', () => {
    expect(withPendingEnvironmentToken({ identity_base_url: 'https://api.example.test' }, 'token-value'))
      .toMatchObject({ identity_base_url: 'https://api.example.test', accessToken: 'token-value', access_token: 'token-value' });
  });

  it('extracts a newly generated OAuth token and its expiry for automatic replacement', () => {
    expect(extractOAuthTokenResponse(JSON.stringify({ data: { access_token: 'Bearer replacement-token', expires_in: 3600 } })))
      .toEqual({ accessToken: 'replacement-token', expiresIn: 3600 });
  });
});

describe('Postman request-body restoration', () => {
  it('restores x-www-form-urlencoded fields instead of changing them to a raw body on refresh', () => {
    const draft = { bodyMode: 'none', urlEncodedRows: [], formDataRows: [], rawBody: '', rawBodyType: 'json' } as any;
    const restored = applyPostmanBodyTemplate(draft, {
      requestBody: { mode: 'urlencoded', urlencoded: [{ key: 'grant_type', value: 'client_credentials' }, { key: 'disabled', value: 'ignore', disabled: true }] },
    });

    expect(restored).toBe(true);
    expect(draft.bodyMode).toBe('x-www-form-urlencoded');
    expect(draft.urlEncodedRows.map((row: any) => [row.key, row.value])).toEqual([['grant_type', 'client_credentials']]);
  });
});

describe('canonical temporary request overrides', () => {
  it('discovers nested object and array field paths using canonical dot notation', () => {
    expect(flattenBodyFields({ user: { email: '', profile: { firstName: '' } }, items: [{ id: '' }] })).toEqual([
      { path: 'user.email', type: 'string' },
      { path: 'user.profile.firstName', type: 'string' },
      { path: 'items[].id', type: 'string' },
    ]);
  });
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
