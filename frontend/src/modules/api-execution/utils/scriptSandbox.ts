export const SCRIPT_SANDBOX_VERSION = '4.11.3';
const DEFAULT_TIMEOUT_MS = 750;
const MAX_LOG_LINES = 20;
const MAX_LOG_CHARS = 512;
const MAX_ERROR_CHARS = 300;
const SECRET_KEY = /(token|secret|password|api.?key|authorization|credential|private.?key|access.?key)/i;
const BLOCKED_SOURCE = /\b(window|document|localStorage|sessionStorage|indexedDB|cookie|fetch|XMLHttpRequest|WebSocket|importScripts|import|eval|Function|globalThis|self|navigator|Worker|constructor|prototype|__proto__|while|for|do)\b/i;

export type ScriptAssertion = { name: string; passed: boolean; message: string };
export type ScriptMutation =
  | { type: 'setUrl'; value: string }
  | { type: 'setHeader'; name: string; value: string }
  | { type: 'setQueryParam'; name: string; value: string }
  | { type: 'setPathParam'; name: string; value: string }
  | { type: 'setBody'; value: string }
  | { type: 'setAuthType'; value: string };

export type SandboxedScriptInput = {
  script: string;
  phase: 'pre-request' | 'test';
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  variables?: Record<string, string>;
  timeoutMs?: number;
};

export type SandboxedScriptResult = {
  ok: boolean;
  logs: string[];
  mutations: ScriptMutation[];
  variables: Record<string, string>;
  assertions: ScriptAssertion[];
  error?: string;
  version: typeof SCRIPT_SANDBOX_VERSION;
};

type WorkerLike = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>;
type WorkerFactory = (url: string) => WorkerLike | null;

function trimText(value: unknown, limit: number): string {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, limit);
}

export function sanitizeScriptError(error: unknown): string {
  const message = trimText(error instanceof Error ? error.message : error, MAX_ERROR_CHARS);
  return message ? `Script failed: ${message.replace(/\b(?:Bearer\s+)?[A-Za-z0-9._~+/=-]{16,}\b/g, '[REDACTED]')}` : 'Script failed.';
}

export function validateScriptSource(script: string): string | null {
  if (script.length > 20_000) return 'Script exceeds the 20 KB limit.';
  const match = script.match(BLOCKED_SOURCE);
  return match ? `Use of "${match[0]}" is not allowed in sandboxed scripts.` : null;
}

function redact(value: unknown, key = ''): unknown {
  if (SECRET_KEY.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, redact(child, childKey)]));
  }
  return value;
}

/** Removes secrets before a request/response/context crosses the sandbox boundary. */
export function createSandboxContext(input: SandboxedScriptInput): Record<string, unknown> {
  const safeVariables = Object.fromEntries(Object.entries(input.variables || {}).map(([key, value]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : String(value)]));
  return {
    request: redact(input.request) as Record<string, unknown>,
    response: redact(input.response || {}) as Record<string, unknown>,
    variables: safeVariables,
  };
}

export function workerSource(): string {
  // This is a deliberately small interpreter, not a JavaScript evaluator.
  // Its grammar permits API calls and simple comparisons only.
  return `
    const LIMIT=20, CHARS=512;
    const text=(v)=>String(v??'').replace(/[\\r\\n\\t]+/g,' ').slice(0,CHARS);
    const freeze=(value)=>{ if(value&&typeof value==='object'){ Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
    const split=(value)=>{ const out=[]; let start=0; let quote='', depth=0; for(let i=0;i<value.length;i+=1){ const ch=value[i]; if(quote){ if(ch===quote&&value[i-1]!=='\\\\') quote=''; continue; } if(ch==='"'||ch==="'") { quote=ch; continue; } if(ch==='('||ch==='['||ch==='{') depth+=1; if(ch===')'||ch===']'||ch==='}') depth-=1; if(ch===','&&depth===0){out.push(value.slice(start,i).trim());start=i+1;} } out.push(value.slice(start).trim()); return out; };
    const value=(source, api)=>{ const input=source.trim(); if(/^['\"]/.test(input)) return input.slice(1,-1); if(/^-?\\d+(?:\\.\\d+)?$/.test(input)) return Number(input); if(input==='true'||input==='false') return input==='true'; if(input==='null') return null; const variable=input.match(/^variables\\.get\\((['\"])(.*?)\\1\\)$/); if(variable) return api.variables.get(variable[2]); const path=input.match(/^(request|response)\\.([A-Za-z0-9_.]+)$/); if(path) return path[2].split('.').reduce((current,key)=>current&&current[key],api[path[1]]); throw new Error('Unsupported value expression'); };
    const condition=(source, api)=>{ const match=source.match(/^(.*?)\\s*(===|!==|==|!=)\\s*(.*?)$/); if(!match) return Boolean(value(source,api)); const left=value(match[1],api), right=value(match[3],api); return match[2]==='==='||match[2]==='==' ? left===right : left!==right; };
    onmessage=({data})=>{
      const logs=[], mutations=[], assertions=[], variables={...data.context.variables};
      const log=(...args)=>{ if(logs.length<LIMIT) logs.push(text(args.map(text).join(' '))); };
      const fail=(name,message)=>assertions.push({name:text(name||'Assertion'),passed:false,message:text(message||'Assertion failed')});
      const assert=(condition,name='Assertion')=>assertions.push({name:text(name),passed:Boolean(condition),message:Boolean(condition)?'Passed':'Assertion failed'});
      const api=Object.freeze({
        variables:Object.freeze({get:(name)=>variables[String(name)] ?? '',set:(name,value)=>{ variables[String(name)]=text(value); }}),
        request:freeze(data.context.request), response:freeze(data.context.response),
        assert, test:(name,fn)=>{ try{ fn(); if(!assertions.some((item)=>item.name===text(name)&&!item.passed)) assertions.push({name:text(name),passed:true,message:'Passed'}); }catch(error){ fail(name,error&&error.message); } },
        helpers:Object.freeze({setUrl:(value)=>mutations.push({type:'setUrl',value:text(value)}),setHeader:(name,value)=>mutations.push({type:'setHeader',name:text(name),value:text(value)}),setQueryParam:(name,value)=>mutations.push({type:'setQueryParam',name:text(name),value:text(value)}),setPathParam:(name,value)=>mutations.push({type:'setPathParam',name:text(name),value:text(value)}),setBody:(value)=>mutations.push({type:'setBody',value:text(value)}),setAuthType:(value)=>mutations.push({type:'setAuthType',value:text(value)}),log}),
        console:Object.freeze({log}),
      });
      try {
        const statements=data.script.split(/[;\\n]+/).map((item)=>item.trim()).filter(Boolean);
        for(const statement of statements){
          const call=statement.match(/^(variables\\.set|helpers\\.(?:setUrl|setHeader|setQueryParam|setPathParam|setBody|setAuthType|log)|console\\.log|assert)\\((.*)\\)$/);
          const wrapped=statement.match(/^test\\((['\"])(.*?)\\1\\s*,\\s*\\(\\)\\s*=>\\s*assert\\((.*)\\)\\s*\\)$/);
          if(wrapped){ const args=split(wrapped[3]); assert(condition(args[0],api), args[1]===undefined?wrapped[2]:value(args[1],api)); continue; }
          if(!call) throw new Error('Unsupported script statement');
          const args=split(call[2]);
          if(call[1]==='variables.set'){ api.variables.set(value(args[0],api),value(args[1],api)); continue; }
          if(call[1]==='assert'){ assert(condition(args[0],api),args[1]===undefined?'Assertion':value(args[1],api)); continue; }
          if(call[1]==='console.log'){ log(...args.map((item)=>value(item,api))); continue; }
          const name=call[1].slice(8); api.helpers[name](...args.map((item)=>value(item,api)));
        }
        postMessage({ok:true,logs,mutations,variables,assertions});
      } catch(error) { postMessage({ok:false,logs,mutations,variables,assertions,error:text(error&&error.message||'Script failed')}); }
    };
  `;
}

function createWorker(): WorkerLike | null {
  if (typeof Worker === 'undefined' || typeof URL === 'undefined') return null;
  const blob = new Blob([workerSource()], { type: 'text/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

export async function runSandboxedScript(input: SandboxedScriptInput, factory: WorkerFactory = createWorker): Promise<SandboxedScriptResult> {
  const empty = (): SandboxedScriptResult => ({ ok: true, logs: [], mutations: [], variables: {}, assertions: [], version: SCRIPT_SANDBOX_VERSION });
  if (!input.script.trim()) return empty();
  const policyError = validateScriptSource(input.script);
  if (policyError) return { ...empty(), ok: false, error: policyError };
  const worker = factory('');
  if (!worker) return { ...empty(), ok: false, error: 'Sandbox is unavailable in this browser.' };
  const timeoutMs = Math.max(100, Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, 2_000));
  return new Promise((resolve) => {
    let done = false;
    const finish = (result: Partial<SandboxedScriptResult>) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve({ ...empty(), ...result, logs: (result.logs || []).slice(0, MAX_LOG_LINES).map((line) => trimText(line, MAX_LOG_CHARS)) });
    };
    const timer = window.setTimeout(() => finish({ ok: false, error: 'Script timed out and was terminated.' }), timeoutMs);
    worker.onmessage = (event: MessageEvent<Partial<SandboxedScriptResult>>) => finish({
      ok: Boolean(event.data.ok), logs: event.data.logs || [], mutations: event.data.mutations || [], variables: event.data.variables || {}, assertions: event.data.assertions || [], error: event.data.error ? sanitizeScriptError(event.data.error) : undefined,
    });
    worker.onerror = () => finish({ ok: false, error: 'Script failed in the isolated sandbox.' });
    worker.postMessage({ script: input.script, context: createSandboxContext(input) });
  });
}
