import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const infraRoot = path.join(__dirname, '..', 'src', 'infrastructure');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === 'persistence') continue;
      walk(full, files);
    } else if (name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

for (const file of walk(infraRoot)) {
  let src = fs.readFileSync(file, 'utf-8');
  const match = src.match(/const DATA_ROOT = path\.join\(process\.cwd\(\), 'data', '([^']+)'\);/);
  if (!match) continue;
  const segment = match[1];
  src = src.replace(
    match[0],
    `function getDataRoot(): string {\n  return path.join(process.cwd(), 'data', '${segment}');\n}`
  );
  src = src.replace(/\bDATA_ROOT\b/g, 'getDataRoot()');
  fs.writeFileSync(file, src, 'utf-8');
  console.log('Lazy root:', path.relative(infraRoot, file));
}
