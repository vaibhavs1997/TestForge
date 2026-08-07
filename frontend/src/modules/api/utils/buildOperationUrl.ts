/** Join environment or service base URL with an operation path. */
export function joinBaseUrlAndPath(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/$/, '');
  const p = path.trim();
  if (!base) {
    return p ? (p.startsWith('/') ? p : `/${p}`) : '';
  }
  if (!p) return base;
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}
