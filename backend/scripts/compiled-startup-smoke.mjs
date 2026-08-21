import { spawn } from 'node:child_process';

const port = Number(process.env.SMOKE_PORT || 43129);
const child = spawn(process.execPath, ['dist/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });
async function waitForHealth() { const deadline = Date.now() + 15_000; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Compiled backend exited early (${child.exitCode}): ${output}`); try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 200)); } throw new Error(`Compiled backend did not become ready: ${output}`); }
try { await waitForHealth(); console.log(`Compiled backend smoke passed on port ${port}`); } finally { if (child.exitCode === null) child.kill('SIGTERM'); await new Promise((resolve) => child.once('exit', resolve)); }
