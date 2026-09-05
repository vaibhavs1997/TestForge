import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
const dataRoot = mkdtempSync(join(tmpdir(), 'testforge-e2e-'));
const environment = { ...process.env, TESTFORGE_E2E_MANAGED: 'true', TESTFORGE_E2E_DATA_ROOT: dataRoot };
const servers = [];
let diagnostic = '';
function start(args, cwd = root, env = {}) {
  const child = spawn(process.execPath, args, { cwd, env: {...environment,...env}, stdio:['ignore','pipe','pipe'], windowsHide:true });
  child.stdout.on('data', chunk => {diagnostic = (diagnostic + chunk).slice(-16000);});
  child.stderr.on('data', chunk => {diagnostic = (diagnostic + chunk).slice(-16000);});
  child.on('error', error => {diagnostic += error.message;});
  servers.push(child);
  return child;
}
async function ready(port, child) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('E2E server exited before readiness: ' + diagnostic);
    try { if ((await fetch('http://127.0.0.1:' + port + (port === 3101 ? '/' : '/health'))).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('E2E server readiness timeout: ' + diagnostic);
}
async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise(resolve => {
    const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('exit', () => {clearTimeout(timeout);resolve();});
    child.kill('SIGTERM');
  });
}
try {
  await Promise.all([3100,3101,3102].map(port => new Promise((resolve,reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error('E2E port ' + port + ' is already in use')));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  })));
  const fixture = start([join(root,'e2e/fixture-api-server.mjs')]);
  const backend = start([join(root,'e2e/backend-server.mjs')], root, {
    NODE_ENV:'production', PORT:'3100', CORS_ORIGIN:'http://127.0.0.1:3101', RATE_LIMIT_ENABLED:'false',
    TESTFORGE_JWT_SECRET:'e2e-only-jwt-secret-not-for-production',
    TESTFORGE_SECRET_STORE_KEY:'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    TESTFORGE_ALLOW_SINGLE_NODE_JSON:'true', AI_ENABLED:'false',RAG_ENABLED:'false',EMBEDDING_ENABLED:'false',
  });
  const frontend = start([join(root,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','3101'], join(root,'frontend'), { TESTFORGE_E2E_BACKEND_URL:'http://127.0.0.1:3100' });
  await Promise.all([ready(3100,backend),ready(3101,frontend),ready(3102,fixture)]);
  const runner = spawn(process.execPath,[join(dirname(require.resolve('playwright/package.json')),'cli.js'),'test',...process.argv.slice(2)], { cwd:root, env:environment, stdio:'inherit',windowsHide:true });
  process.exitCode = await new Promise((resolve,reject) => {runner.once('exit',code=>resolve(code ?? 1));runner.once('error',reject);});
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await Promise.all(servers.map(stop));
}
