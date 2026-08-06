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
  if (!src.includes('readJsonArray')) continue;

  src = src.replace(
    /private (\w+)\((projectId: string)\): ([A-Za-z<>\[\]|]+) \{\s*\n(\s*)const filePath/g,
    'private async $1($2): Promise<$3> {\n$4const filePath'
  );

  src = src.replace(
    /return readJsonArray<([^>]+)>\(filePath\);/g,
    'return readJsonArray<$1>(filePath);'
  );

  src = src.replace(
    /return readJsonArray\(filePath\);/g,
    'return readJsonArray(filePath);'
  );

  fs.writeFileSync(file, src, 'utf-8');
}
