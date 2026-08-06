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
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

const importLine = "import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';";

for (const file of walk(infraRoot)) {
  let src = fs.readFileSync(file, 'utf-8');
  if (!src.includes('writeFileSync') && !src.includes('readFileSync(filePath')) {
    continue;
  }
  if (src.includes('JsonFileStore')) {
    continue;
  }

  const lines = src.split('\n');
  const lastImport = lines.reduce((idx, line, i) => (line.startsWith('import ') ? i : idx), 0);
  lines.splice(lastImport + 1, 0, importLine);
  src = lines.join('\n');

  src = src.replace(
    /fs\.writeFileSync\(([^,]+),\s*JSON\.stringify\(([^,]+),\s*null,\s*2\)\);/g,
    'await writeJsonArray($1, $2);'
  );
  src = src.replace(
    /fs\.writeFileSync\(([^,]+),\s*JSON\.stringify\(([^)]+)\)\);/g,
    'await writeJsonArray($1, $2);'
  );

  src = src.replace(
    /if \(!fs\.existsSync\(filePath\)\) return \[\];\s*\n\s*const data = fs\.readFileSync\(filePath, 'utf-8'\);\s*\n\s*return JSON\.parse\(data\);/g,
    'return readJsonArray(filePath);'
  );

  src = src.replace(
    /if \(!fs\.existsSync\(filePath\)\) return \[\];\s*\n\s*const data = fs\.readFileSync\(filePath, 'utf-8'\);\s*\n\s*return JSON\.parse\(data\) as [^;]+;/g,
    'return readJsonArray(filePath);'
  );

  fs.writeFileSync(file, src, 'utf-8');
  console.log('Updated', path.relative(infraRoot, file));
}
