#!/usr/bin/env tsx
/**
 * Smoke-test key API integration endpoints (backend must be running).
 * Usage: npx tsx scripts/integration-smoke.ts [baseUrl]
 */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

type Check = { name: string; method: string; path: string; expectStatus: number };

const checks: Check[] = [
  { name: 'health', method: 'GET', path: '/health', expectStatus: 200 },
  { name: 'projects list', method: 'GET', path: '/api/projects', expectStatus: 200 },
  { name: 'backups list', method: 'GET', path: '/api/backups', expectStatus: 200 },
  { name: 'sse stream', method: 'GET', path: '/api/events/stream', expectStatus: 200 },
];

async function runCheck(check: Check, projectId?: string): Promise<{ ok: boolean; detail: string }> {
  let path = check.path;
  if (projectId && path.includes(':projectId')) {
    path = path.replace(':projectId', encodeURIComponent(projectId));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${base}${path}`, {
      method: check.method,
      signal: controller.signal,
      headers: { Accept: 'application/json, text/event-stream' },
    });

    if (check.name === 'sse stream') {
      if (res.status !== check.expectStatus) {
        return { ok: false, detail: `status ${res.status}` };
      }
      const reader = res.body?.getReader();
      if (!reader) {
        return { ok: false, detail: 'no body' };
      }
      const chunk = await reader.read();
      await reader.cancel();
      const text = chunk.value ? new TextDecoder().decode(chunk.value) : '';
      const ok = text.includes('event:');
      return { ok, detail: ok ? 'SSE handshake ok' : 'missing event frame' };
    }

    const ok = res.status === check.expectStatus;
    let detail = `status ${res.status}`;
    if (ok && res.headers.get('content-type')?.includes('json')) {
      const body = await res.json();
      if (body && typeof body === 'object' && 'success' in body) {
        detail += body.success ? ', success=true' : ', success=false';
      }
    }
    return { ok, detail };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  console.log(`Integration smoke against ${base}\n`);

  let projectId: string | undefined;
  const projectRes = await runCheck({ name: 'p', method: 'GET', path: '/api/projects', expectStatus: 200 });
  if (projectRes.ok) {
    try {
      const res = await fetch(`${base}/api/projects`);
      const json = await res.json();
      const list = json?.data;
      if (Array.isArray(list) && list.length > 0) {
        projectId = list[0].id;
      }
    } catch {
      // ignore
    }
  }

  const projectScoped: Check[] = projectId
    ? [
        { name: 'services', method: 'GET', path: `/api/projects/${projectId}/services`, expectStatus: 200 },
        { name: 'environments', method: 'GET', path: `/api/projects/${projectId}/environments`, expectStatus: 200 },
        { name: 'audit', method: 'GET', path: `/api/projects/${projectId}/audit`, expectStatus: 200 },
        { name: 'datasets', method: 'GET', path: `/api/projects/${projectId}/test-data/datasets`, expectStatus: 200 },
        { name: 'requirements', method: 'GET', path: `/api/projects/${projectId}/requirements`, expectStatus: 200 },
        { name: 'suites', method: 'GET', path: `/api/projects/${projectId}/suites`, expectStatus: 200 },
        { name: 'reports', method: 'GET', path: `/api/projects/${projectId}/reports`, expectStatus: 200 },
        { name: 'assertions', method: 'GET', path: `/api/projects/${projectId}/assertions`, expectStatus: 200 },
        { name: 'knowledge flows', method: 'GET', path: `/api/projects/${projectId}/knowledge/flows`, expectStatus: 200 },
        { name: 'context', method: 'GET', path: `/api/projects/${projectId}/context`, expectStatus: 200 },
      ]
    : [];

  const all = [...checks, ...projectScoped];
  let failed = 0;

  for (const check of all) {
    const result = await runCheck(check, projectId);
    const mark = result.ok ? 'OK' : 'FAIL';
    if (!result.ok) failed += 1;
    console.log(`[${mark}] ${check.name}: ${result.detail}`);
  }

  if (!projectId) {
    console.log('\n(warn) No projects in registry — skipped project-scoped checks');
  }

  console.log(`\n${failed === 0 ? 'All checks passed' : `${failed} check(s) failed`}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
