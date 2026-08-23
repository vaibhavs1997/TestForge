import http from 'node:http';

let slowStarted = 0;
let completedRequests = 0;
let retryAttempts = 0;
const pendingTimers = new Set();
const server = http.createServer((req, res) => {
  if (req.url === '/__fixture/state') {
    const body = JSON.stringify({ slowStarted, completedRequests, retryAttempts });
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
    res.end(body);
    return;
  }
  if (req.url === '/retry-assert') {
    retryAttempts += 1;
    completedRequests += 1;
    const status = retryAttempts === 1 ? 500 : 200;
    // The successful retry deliberately omits the generated `data` member.
    // This proves a 2xx retry cannot turn an assertion failure into a pass.
    const body = JSON.stringify({ ok: true, attempt: retryAttempts });
    res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
    res.end(body);
    return;
  }
  if (req.url === '/slow') {
    slowStarted += 1;
    const finish = () => {
      if (res.destroyed) return;
      completedRequests += 1;
      const body = JSON.stringify({ ok: true, id: 'slow-fixture' });
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
      res.end(body);
    };
    // Long enough for explicit synchronization/cancellation, short enough to
    // make a late-response race observable in the production test.
    const timer = setTimeout(() => { pendingTimers.delete(timer); finish(); }, 2_000);
    pendingTimers.add(timer);
    return;
  }
  completedRequests += 1;
  const body = JSON.stringify(req.url === '/health' ? { ok: true } : { ok: true, id: 'fixture-42' });
  res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
});
server.listen(3102, '127.0.0.1');
const shutdown = () => {
  for (const timer of pendingTimers) clearTimeout(timer);
  pendingTimers.clear();
  // Playwright may terminate the web-server process while a keep-alive
  // connection is open; force-close those sockets so the next run can bind.
  server.closeAllConnections?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
};
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, shutdown);
