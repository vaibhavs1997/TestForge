import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { createSandboxContext, runSandboxedScript, validateScriptSource, workerSource } from './scriptSandbox';

function workerThatReplies(reply: Record<string, unknown>) {
  let messageHandler: ((event: MessageEvent) => void) | null = null;
  const worker = {
    postMessage: vi.fn(() => queueMicrotask(() => messageHandler?.({ data: reply } as MessageEvent))),
    terminate: vi.fn(),
    onerror: null as Worker['onerror'],
    get onmessage() { return messageHandler; },
    set onmessage(handler) { messageHandler = handler; },
  };
  return worker;
}

describe('script sandbox policy', () => {
  it.each(['window.location.href', 'document.cookie', 'localStorage.getItem("x")', 'fetch("https://example.test")', `new ${'Function'}("return 1")`, 'import("x")'])(
    'rejects forbidden capability: %s',
    (script) => expect(validateScriptSource(script)).toMatch(/not allowed/i),
  );

  it('redacts secret values before crossing the worker boundary', () => {
    const context = createSandboxContext({
      phase: 'pre-request', script: 'variables.get("token")',
      request: { headers: { Authorization: 'Bearer super-secret-token' }, body: { password: 'secret-password', name: 'safe' } },
      response: { body: { access_token: 'response-secret' } },
      variables: { token: 'secret-value', region: 'us-east-1' },
    });
    expect(JSON.stringify(context)).not.toContain('super-secret-token');
    expect(JSON.stringify(context)).not.toContain('secret-password');
    expect(JSON.stringify(context)).not.toContain('response-secret');
    expect(JSON.stringify(context)).not.toContain('secret-value');
    expect(context).toMatchObject({ variables: { token: '[REDACTED]', region: 'us-east-1' } });
  });

  it('keeps the supported helper and assertion script forms compatible', () => {
    expect(validateScriptSource('helpers.setHeader("X-Test", "1"); variables.set("region", "eu-west-1");')).toBeNull();
    expect(validateScriptSource('test("status is 200", () => assert(response.status === 200, "status is 200"))')).toBeNull();
    expect(createSandboxContext({ phase: 'test', script: '', request: { method: 'POST', body: { id: 1 } }, response: { status: 201 } }))
      .toMatchObject({ request: { method: 'POST', body: { id: 1 } }, response: { status: 201 } });
  });

  it('returns only allowed variable, request mutation, log and assertion outputs', async () => {
    const worker = workerThatReplies({
      ok: true,
      logs: ['request accepted'],
      variables: { region: 'eu-west-1' },
      mutations: [{ type: 'setHeader', name: 'X-Test', value: '1' }],
      assertions: [{ name: 'status is 200', passed: true, message: 'Passed' }],
    });
    const result = await runSandboxedScript({ phase: 'test', script: 'assert(response.status === 200, "status is 200")', request: { method: 'GET' }, response: { status: 200 } }, () => worker);
    expect(result.ok).toBe(true);
    expect(result.variables.region).toBe('eu-west-1');
    expect(result.mutations).toEqual([{ type: 'setHeader', name: 'X-Test', value: '1' }]);
    expect(result.assertions).toEqual([{ name: 'status is 200', passed: true, message: 'Passed' }]);
    expect(result.logs).toEqual(['request accepted']);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates an unresponsive worker after the execution limit', async () => {
    vi.useFakeTimers();
    const worker = workerThatReplies({});
    worker.postMessage.mockImplementation(() => undefined);
    const promise = runSandboxedScript({ phase: 'pre-request', script: 'helpers.setHeader("X-Test", "1")', request: {}, timeoutMs: 100 }, () => worker);
    await vi.advanceTimersByTimeAsync(101);
    await expect(promise).resolves.toMatchObject({ ok: false, error: 'Script timed out and was terminated.' });
    expect(worker.terminate).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('isolates worker errors without exposing implementation details', async () => {
    const worker = workerThatReplies({ ok: false, error: 'Error: token abcdefghijklmnopqrstuvwxyz' });
    const result = await runSandboxedScript({ phase: 'test', script: 'throw new Error("bad")', request: {} }, () => worker);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Script failed:');
    expect(result.error).not.toContain('abcdefghijklmnopqrstuvwxyz');
  });
});

it('executes the real worker interpreter with multiple helper arguments', () => {
  const postMessage = vi.fn();
  const sandbox: any = { postMessage };
  runInNewContext(workerSource(), sandbox);
  sandbox.onmessage({ data: { script: 'helpers.setHeader("X-Test", "one,two"); variables.set("region", "west"); assert(response.status === 200, "status")', context: { request: {}, response: {status:200}, variables: {} } } });
  expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ ok: true, variables: { region: 'west' }, mutations: [{type:'setHeader', name:'X-Test', value:'one,two'}], assertions: [{name:'status',passed:true,message:'Passed'}] }));
});
