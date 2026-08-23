import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let loaded = false;

/** Load environment from repository root `.env` (single source of truth). */
export function loadEnv(): void {
  if (loaded) {
    return;
  }
  loaded = true;

  const backendRoot = path.resolve(__dirname, '..', '..');
  const repoRoot = path.resolve(backendRoot, '..');
  const rootEnv = path.join(repoRoot, '.env');
  const legacyBackendEnv = path.join(backendRoot, '.env');

  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
    return;
  }

  if (fs.existsSync(legacyBackendEnv)) {
    console.warn(
      '[TestForge] Using backend/.env — move variables to the repository root .env (see .env.example).',
    );
    dotenv.config({ path: legacyBackendEnv });
  }
}
