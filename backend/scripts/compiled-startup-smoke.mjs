import { spawn } from 'node:child_process';

const port = Number(process.env.SMOKE_PORT || 43129);
const child = spawn(process.execPath, ['dist/index.js'], { cwd: process.cwd(), env: {
  ...process.env,
  PORT: String(port),
  NODE_ENV: 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://127.0.0.1:43129',
  TESTFORGE_JWT_SECRET: process.env.TESTFORGE_JWT_SECRET || 'compiled-smoke-jwt-secret-not-for-production',
  TESTFORGE_SECRET_STORE_KEY: process.env.TESTFORGE_SECRET_STORE_KEY || 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
  TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true',
  RAG_ENABLED: 'false',
  EMBEDDING_ENABLED: 'false',
  AI_ENABLED: 'false',
}, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });
async function waitForHealth() { const deadline = Date.now() + 15_000; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Compiled backend exited early (${child.exitCode}): ${output}`); try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 200)); } throw new Error(`Compiled backend did not become ready: ${output}`); }
async function stopChild() {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([
    exited,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Compiled backend did not stop after SIGTERM: ${output}`)), 12_000)),
  ]);
}

try { await waitForHealth(); console.log(`Compiled backend smoke passed on port ${port}`); } finally { await stopChild(); }
