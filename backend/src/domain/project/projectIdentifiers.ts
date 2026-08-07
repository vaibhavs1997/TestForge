/** URL-safe slug used as projectKey (lowercase, hyphens). */
export function slugifyProjectKey(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'project'
  );
}

/** Short workspace id prefix from project name (e.g. "Global Product Registration" → GPR). */
export function acronymFromProjectName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase();
  if (letters.length >= 2) return letters.slice(0, 8);
  const alnum = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (alnum.slice(0, 3) || 'PRJ').slice(0, 8);
}

export function allocateProjectIdentifiers(
  name: string,
  existing: Array<{ id: string; projectKey: string }>,
): { id: string; projectKey: string } {
  const usedIds = new Set(existing.map((p) => p.id));
  const usedKeys = new Set(existing.map((p) => p.projectKey.toLowerCase()));

  const baseKey = slugifyProjectKey(name);
  let projectKey = baseKey;
  let keySuffix = 2;
  while (usedKeys.has(projectKey)) {
    const suffix = `-${keySuffix++}`;
    projectKey = `${baseKey.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
  }

  const prefix = acronymFromProjectName(name);
  let sequence = 1;
  let id = `${prefix}_${String(sequence).padStart(2, '0')}`;
  while (usedIds.has(id)) {
    sequence += 1;
    id = `${prefix}_${String(sequence).padStart(2, '0')}`;
  }

  return { id, projectKey };
}
