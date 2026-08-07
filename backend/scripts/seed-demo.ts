/**
 * Seed demo projects and sync folders under backend/data.
 * Run from repo root: npm run seed --workspace=backend
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../src/config/loadEnv.js';
import { JsonProjectRepository } from '../src/infrastructure/project/JsonProjectRepository';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));
loadEnv();

const repo = new JsonProjectRepository();

const demos = [
  { id: '1', name: 'Demo APIs', projectKey: 'demo-apis', description: 'Default demo workspace' },
  { id: 'GPR_01', name: 'GPR 01', projectKey: 'gpr-01', description: 'Sample GPR project' },
];

async function main() {
  for (const demo of demos) {
    try {
      await repo.create(demo);
      console.log(`Created project ${demo.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already exists')) {
        console.log(`Project ${demo.id} already registered`);
      } else {
        throw err;
      }
    }
  }

  const all = await repo.syncDiscoveredProjects();
  console.log(`Registry contains ${all.length} project(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
