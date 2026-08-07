/**
 * Issue a short-lived JWT for local API testing (requires TESTFORGE_JWT_SECRET).
 * Example: npx tsx scripts/issue-jwt.ts --sub dev@local --projects '*'
 */
import { loadEnv } from '../src/config/loadEnv.js';
import jwt from 'jsonwebtoken';

loadEnv();

const secret = process.env.TESTFORGE_JWT_SECRET?.trim();
if (!secret) {
  console.error('Set TESTFORGE_JWT_SECRET in the repository root .env first.');
  process.exit(1);
}

const args = process.argv.slice(2);
const subIdx = args.indexOf('--sub');
const projectsIdx = args.indexOf('--projects');
const sub = subIdx >= 0 ? args[subIdx + 1] : 'dev-user';
const projectsRaw = projectsIdx >= 0 ? args[projectsIdx + 1] : '*';
const projects = projectsRaw === '*' ? '*' : projectsRaw.split(',').map((p) => p.trim());

const token = jwt.sign({ sub, projects }, secret, { expiresIn: '8h' });
console.log(token);
