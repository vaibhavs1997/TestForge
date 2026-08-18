import React from 'react';
import { useParams } from 'react-router-dom';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type BodyMode = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';
type RawBodyType = 'json' | 'text' | 'xml' | 'html' | 'javascript';

type HeaderRow = {
  id: string;
  name: string;
  value: string;
};

type KeyValueRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
};

type ResponseState = {
  status: number | null;
  statusText: string;
  durationMs: number | null;
  headers: Array<[string, string]>;
  body: string;
  isJson: boolean;
};

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_MODES: Array<{ value: BodyMode; label: string }> = [
  { value: 'none', label: 'none' },
  { value: 'form-data', label: 'form-data' },
  { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'raw', label: 'raw' },
  { value: 'binary', label: 'binary' },
  { value: 'graphql', label: 'GraphQL' },
];
const RAW_BODY_TYPES: Array<{ value: RawBodyType; label: string; contentType: string }> = [
  { value: 'json', label: 'JSON', contentType: 'application/json' },
  { value: 'text', label: 'Text', contentType: 'text/plain; charset=utf-8' },
  { value: 'xml', label: 'XML', contentType: 'application/xml' },
  { value: 'html', label: 'HTML', contentType: 'text/html; charset=utf-8' },
  { value: 'javascript', label: 'JavaScript', contentType: 'text/javascript; charset=utf-8' },
];

const createHeaderRow = (name = '', value = ''): HeaderRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name,
  value,
});

const createKeyValueRow = (key = '', value = '', description = ''): KeyValueRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  enabled: true,
  key,
  value,
  description,
});

const formatResponseBody = (text: string): { body: string; isJson: boolean } => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { body: '', isJson: false };
  }

  try {
    return { body: JSON.stringify(JSON.parse(trimmed), null, 2), isJson: true };
  } catch {
    return { body: text, isJson: false };
  }
};

const keyValueRowsToObject = (rows: KeyValueRow[]): Record<string, string> => {
  return rows.reduce<Record<string, string>>((acc, row) => {
    if (!row.enabled) {
      return acc;
    }
    const key = row.key.trim();
    if (!key) {
      return acc;
    }
    acc[key] = row.value;
    return acc;
  }, {});
};

export const ApiExecutionPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [method, setMethod] = React.useState<HttpMethod>('GET');
  const [url, setUrl] = React.useState('https://');
  const [headers, setHeaders] = React.useState<HeaderRow[]>([createHeaderRow('Accept', 'application/json')]);
  const [bodyMode, setBodyMode] = React.useState<BodyMode>('none');
  const [formDataRows, setFormDataRows] = React.useState<KeyValueRow[]>([createKeyValueRow()]);
  const [urlEncodedRows, setUrlEncodedRows] = React.useState<KeyValueRow[]>([createKeyValueRow()]);
  const [rawBodyType, setRawBodyType] = React.useState<RawBodyType>('json');
  const [rawBody, setRawBody] = React.useState('{\n  "name": "TestForge"\n}');
  const [binaryFile, setBinaryFile] = React.useState<File | null>(null);
  const [graphqlQuery, setGraphqlQuery] = React.useState('query Example {\n  __typename\n}');
  const [graphqlVariables, setGraphqlVariables] = React.useState('{\n  "example": true\n}');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState<ResponseState | null>(null);
  const binaryFileInputRef = React.useRef<HTMLInputElement>(null);

  const updateHeader = (id: string, field: 'name' | 'value', value: string) => {
    setHeaders((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addHeader = () => {
    setHeaders((current) => [...current, createHeaderRow()]);
  };

  const removeHeader = (id: string) => {
    setHeaders((current) => (current.length === 1 ? [createHeaderRow()] : current.filter((row) => row.id !== id)));
  };

  const updateKeyValueRow = (
    rows: KeyValueRow[],
    setRows: React.Dispatch<React.SetStateAction<KeyValueRow[]>>,
    id: string,
    field: keyof KeyValueRow,
    value: string | boolean,
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } as KeyValueRow : row)),
    );
  };

  const addKeyValueRow = (setRows: React.Dispatch<React.SetStateAction<KeyValueRow[]>>) => {
    setRows((current) => [...current, createKeyValueRow()]);
  };

  const removeKeyValueRow = (setRows: React.Dispatch<React.SetStateAction<KeyValueRow[]>>, id: string) => {
    setRows((current) => (current.length === 1 ? [createKeyValueRow()] : current.filter((row) => row.id !== id)));
  };

  const resetBodyEditor = (mode: BodyMode) => {
    setBodyMode(mode);
    setError(null);
  };

  const sendRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const normalizedUrl = url.trim();
      if (!normalizedUrl) {
        throw new Error('Add a request URL first.');
      }

      const requestHeaders = new Headers();
      headers.forEach((row) => {
        const name = row.name.trim();
        const value = row.value.trim();
        if (name && value) {
          requestHeaders.set(name, value);
        }
      });

      const hasBody = !['GET', 'HEAD'].includes(method);
      const requestInit: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (hasBody && bodyMode !== 'none') {
        if (bodyMode === 'form-data') {
          const formData = new FormData();
          formDataRows.forEach((row) => {
            const key = row.key.trim();
            if (row.enabled && key) {
              formData.append(key, row.value);
            }
          });
          requestInit.body = formData;
          requestHeaders.delete('Content-Type');
        } else if (bodyMode === 'x-www-form-urlencoded') {
          const searchParams = new URLSearchParams();
          urlEncodedRows.forEach((row) => {
            const key = row.key.trim();
            if (row.enabled && key) {
              searchParams.append(key, row.value);
            }
          });
          requestInit.body = searchParams.toString();
          requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
        } else if (bodyMode === 'raw') {
          requestInit.body = rawBody;
          const selectedType = RAW_BODY_TYPES.find((item) => item.value === rawBodyType);
          requestHeaders.set('Content-Type', selectedType?.contentType ?? 'application/json');
        } else if (bodyMode === 'binary') {
          if (!binaryFile) {
            throw new Error('Choose a file for binary upload.');
          }
          requestInit.body = binaryFile;
          requestHeaders.delete('Content-Type');
        } else if (bodyMode === 'graphql') {
          const variablesText = graphqlVariables.trim();
          let parsedVariables: unknown = {};
          if (variablesText) {
            parsedVariables = JSON.parse(variablesText);
          }
          requestInit.body = JSON.stringify({
            query: graphqlQuery,
            variables: parsedVariables,
          });
          requestHeaders.set('Content-Type', 'application/json');
        }
      }

      const startedAt = performance.now();
      const res = await fetch(normalizedUrl, requestInit);
      const durationMs = Math.round(performance.now() - startedAt);
      const text = await res.text();
      const formatted = formatResponseBody(text);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        durationMs,
        headers: Array.from(res.headers.entries()),
        body: formatted.body,
        isJson: formatted.isJson,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-text'>API Execution</h1>
        <p className='mt-1 text-sm text-text-secondary'>
          Standalone request runner for project {projectId ? `#${projectId}` : 'workspace'}.
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6'>
          <form className='space-y-5' onSubmit={sendRequest}>
            <div className='grid gap-3 md:grid-cols-[160px_1fr]'>
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium text-text'>Method</span>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as HttpMethod)}
                  className='h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                >
                  {HTTP_METHODS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium text-text'>Request URL</span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder='https://api.example.com/v1/users'
                  className='h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                />
              </label>
            </div>

            <section className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h2 className='text-sm font-semibold text-text'>Headers</h2>
                  <p className='text-xs text-text-secondary'>Add any request headers you need.</p>
                </div>
                <button
                  type='button'
                  onClick={addHeader}
                  className='rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface'
                >
                  Add header
                </button>
              </div>

              <div className='space-y-2'>
                {headers.map((row) => (
                  <div key={row.id} className='grid gap-2 md:grid-cols-[1fr_1fr_auto]'>
                    <input
                      value={row.name}
                      onChange={(event) => updateHeader(row.id, 'name', event.target.value)}
                      placeholder='Header name'
                      className='h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                    />
                    <input
                      value={row.value}
                      onChange={(event) => updateHeader(row.id, 'value', event.target.value)}
                      placeholder='Header value'
                      className='h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                    />
                    <button
                      type='button'
                      onClick={() => removeHeader(row.id)}
                      className='h-11 rounded-lg border border-border px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text'
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className='space-y-3'>
              <div>
                <h2 className='text-sm font-semibold text-text'>Body</h2>
                <p className='text-xs text-text-secondary'>Choose a body type and the matching editor will appear below.</p>
              </div>

              <div className='flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-border bg-surface/50 p-3'>
                {BODY_MODES.map((option) => (
                  <label key={option.value} className='flex items-center gap-2 text-sm text-text'>
                    <input
                      type='radio'
                      name='body-mode'
                      value={option.value}
                      checked={bodyMode === option.value}
                      onChange={() => resetBodyEditor(option.value)}
                      className='h-4 w-4 accent-primary'
                    />
                    <span className='capitalize'>{option.label}</span>
                  </label>
                ))}
              </div>

              {bodyMode === 'none' && (
                <div className='rounded-xl border border-dashed border-border bg-surface/40 p-4 text-sm text-text-secondary'>
                  No request body will be sent.
                </div>
              )}

              {bodyMode === 'raw' && (
                <div className='space-y-3'>
                  <label className='block'>
                    <span className='mb-1.5 block text-sm font-medium text-text'>Raw type</span>
                    <select
                      value={rawBodyType}
                      onChange={(event) => setRawBodyType(event.target.value as RawBodyType)}
                      className='h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                    >
                      {RAW_BODY_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <textarea
                    value={rawBody}
                    onChange={(event) => setRawBody(event.target.value)}
                    placeholder='{"name":"TestForge"}'
                    rows={12}
                    className='w-full rounded-xl border border-border bg-surface p-3 font-mono text-sm text-text outline-none focus:border-primary'
                  />
                </div>
              )}

              {bodyMode === 'form-data' && (
                <div className='space-y-3'>
                  <div className='overflow-hidden rounded-2xl border border-border'>
                    <div className='grid grid-cols-[72px_1.2fr_1.2fr_1fr_auto] gap-2 border-b border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      <span>On</span>
                      <span>Key</span>
                      <span>Value</span>
                      <span>Description</span>
                      <span className='text-right'> </span>
                    </div>
                    <div className='divide-y divide-border'>
                      {formDataRows.map((row) => (
                        <div key={row.id} className='grid grid-cols-[72px_1.2fr_1.2fr_1fr_auto] gap-2 px-3 py-2'>
                          <div className='flex items-center'>
                            <input
                              type='checkbox'
                              checked={row.enabled}
                              onChange={(event) => updateKeyValueRow(formDataRows, setFormDataRows, row.id, 'enabled', event.target.checked)}
                              className='h-4 w-4 rounded border-border accent-primary'
                            />
                          </div>
                          <input
                            value={row.key}
                            onChange={(event) => updateKeyValueRow(formDataRows, setFormDataRows, row.id, 'key', event.target.value)}
                            placeholder='Key'
                            className='h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                          />
                          <input
                            value={row.value}
                            onChange={(event) => updateKeyValueRow(formDataRows, setFormDataRows, row.id, 'value', event.target.value)}
                            placeholder='Value'
                            className='h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                          />
                          <input
                            value={row.description}
                            onChange={(event) => updateKeyValueRow(formDataRows, setFormDataRows, row.id, 'description', event.target.value)}
                            placeholder='Description'
                            className='h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                          />
                          <button
                            type='button'
                            onClick={() => removeKeyValueRow(setFormDataRows, row.id)}
                            className='h-10 rounded-lg border border-border px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text'
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => addKeyValueRow(setFormDataRows)}
                    className='rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface'
                  >
                    Add row
                  </button>
                </div>
              )}

              {bodyMode === 'x-www-form-urlencoded' && (
                <div className='space-y-3'>
                  <div className='overflow-hidden rounded-2xl border border-border'>
                    <div className='grid grid-cols-[72px_1.2fr_1.2fr_1fr_auto] gap-2 border-b border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      <span>On</span>
                      <span>Key</span>
                      <span>Value</span>
                      <span>Description</span>
                      <span className='text-right'> </span>
                    </div>
                    <div className='divide-y divide-border'>
                      {urlEncodedRows.map((row) => (
                        <div key={row.id} className='grid grid-cols-[72px_1.2fr_1.2fr_1fr_auto] gap-2 px-3 py-2'>
                          <div className='flex items-center'>
                            <input
                              type='checkbox'
                              checked={row.enabled}
                              onChange={(event) => updateKeyValueRow(urlEncodedRows, setUrlEncodedRows, row.id, 'enabled', event.target.checked)}
                              className='h-4 w-4 rounded border-border accent-primary'
                            />
                          </div>
                          <input
                            value={row.key}
                            onChange={(event) => updateKeyValueRow(urlEncodedRows, setUrlEncodedRows, row.id, 'key', event.target.value)}
                            placeholder='Key'
                            className='h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                          />
                          <input
                            value={row.value}
                            onChange={(event) => updateKeyValueRow(urlEncodedRows, setUrlEncodedRows, row.id, 'value', event.target.value)}
                            placeholder='Value'
                            className='h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                          />
                          <input
                            value={row.description}
                            onChange={(event) => updateKeyValueRow(urlEncodedRows, setUrlEncodedRows, row.id, 'description', event.target.value)}
                            placeholder='Description'
                            className='h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary'
                          />
                          <button
                            type='button'
                            onClick={() => removeKeyValueRow(setUrlEncodedRows, row.id)}
                            className='h-10 rounded-lg border border-border px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text'
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => addKeyValueRow(setUrlEncodedRows)}
                    className='rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface'
                  >
                    Add row
                  </button>
                </div>
              )}

              {bodyMode === 'binary' && (
                <div className='space-y-3'>
                  <input
                    ref={binaryFileInputRef}
                    type='file'
                    onChange={(event) => setBinaryFile(event.target.files?.[0] ?? null)}
                    className='block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text file:mr-4 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium file:text-text hover:file:bg-surface/80'
                  />
                  <div className='rounded-xl border border-dashed border-border bg-surface/40 p-4 text-sm text-text-secondary'>
                    {binaryFile ? (
                      <span>Selected file: <span className='font-medium text-text'>{binaryFile.name}</span></span>
                    ) : (
                      <span>Choose a file to upload as the request body.</span>
                    )}
                  </div>
                </div>
              )}

              {bodyMode === 'graphql' && (
                <div className='space-y-4'>
                  <label className='block'>
                    <span className='mb-1.5 block text-sm font-medium text-text'>GraphQL query</span>
                    <textarea
                      value={graphqlQuery}
                      onChange={(event) => setGraphqlQuery(event.target.value)}
                      rows={8}
                      className='w-full rounded-xl border border-border bg-surface p-3 font-mono text-sm text-text outline-none focus:border-primary'
                    />
                  </label>
                  <label className='block'>
                    <span className='mb-1.5 block text-sm font-medium text-text'>Variables</span>
                    <textarea
                      value={graphqlVariables}
                      onChange={(event) => setGraphqlVariables(event.target.value)}
                      rows={8}
                      className='w-full rounded-xl border border-border bg-surface p-3 font-mono text-sm text-text outline-none focus:border-primary'
                    />
                  </label>
                </div>
              )}
            </section>

            {error && (
              <div className='rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700'>
                {error}
              </div>
            )}

            <div className='flex items-center justify-end gap-3'>
              <button
                type='button'
                onClick={() => {
                  setMethod('GET');
                  setUrl('https://');
                  setHeaders([createHeaderRow('Accept', 'application/json')]);
                  setBodyMode('none');
                  setFormDataRows([createKeyValueRow()]);
                  setUrlEncodedRows([createKeyValueRow()]);
                  setRawBodyType('json');
                  setRawBody('{\n  "name": "TestForge"\n}');
                  setBinaryFile(null);
                  if (binaryFileInputRef.current) {
                    binaryFileInputRef.current.value = '';
                  }
                  setGraphqlQuery('query Example {\n  __typename\n}');
                  setGraphqlVariables('{\n  "example": true\n}');
                  setError(null);
                  setResponse(null);
                }}
                className='rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface'
              >
                Reset
              </button>
              <button
                type='submit'
                disabled={loading}
                className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {loading ? 'Sending...' : 'Send request'}
              </button>
            </div>
          </form>
        </div>

        <div className='space-y-6'>
          <div className='rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6'>
            <h2 className='text-sm font-semibold text-text'>Response</h2>
            <p className='mt-1 text-xs text-text-secondary'>Results from the last request appear here.</p>

            {response ? (
              <div className='mt-4 space-y-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text'>
                    {response.status} {response.statusText}
                  </span>
                  <span className='rounded-full bg-surface px-3 py-1 text-xs text-text-secondary'>
                    {response.durationMs} ms
                  </span>
                  <span className='rounded-full bg-surface px-3 py-1 text-xs text-text-secondary'>
                    {response.isJson ? 'JSON' : 'Text'}
                  </span>
                </div>

                <div>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                    Body
                  </h3>
                  <pre className='max-h-[340px] overflow-auto rounded-xl border border-border bg-surface p-3 text-xs text-text whitespace-pre-wrap'>
                    {response.body || '(empty response body)'}
                  </pre>
                </div>

                <div>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                    Headers
                  </h3>
                  <div className='max-h-[220px] overflow-auto rounded-xl border border-border bg-surface p-3 text-xs text-text-secondary'>
                    {response.headers.length > 0 ? (
                      <ul className='space-y-1'>
                        {response.headers.map(([name, value]) => (
                          <li key={`${name}:${value}`} className='break-words'>
                            <span className='font-medium text-text'>{name}</span>: {value}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No response headers.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className='mt-4 rounded-xl border border-dashed border-border bg-surface/40 p-4 text-sm text-text-secondary'>
                Send a request to inspect the response here.
              </div>
            )}
          </div>

          <div className='rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6'>
            <h2 className='text-sm font-semibold text-text'>Notes</h2>
            <ul className='mt-3 space-y-2 text-sm text-text-secondary'>
              <li>- This page runs directly in the browser with `fetch`.</li>
              <li>- If the target API blocks CORS, the browser will reject the request.</li>
              <li>- Use full URLs with `https://` or `http://`.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiExecutionPage;
