import * as yaml from 'js-yaml';

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.text',
  '.md',
  '.markdown',
  '.mdx',
  '.rst',
  '.log',
  '.csv',
  '.tsv',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.htm',
  '.adoc',
  '.asciidoc',
  '.ini',
  '.env',
  '.properties',
  '.rtf',
]);

function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripRtf(rtf: string): string {
  return rtf
    .replace(/\\[a-z]+\d* ?/gi, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMostlyText(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  let nonPrintable = 0;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte < 32 || byte === 127) nonPrintable += 1;
  }
  return nonPrintable / sample.length < 0.12;
}

export async function extractDocumentText(fileName: string, buffer: Buffer): Promise<string> {
  const ext = extensionOf(fileName);

  if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      return (textResult.text || '').trim();
    } finally {
      await parser.destroy();
    }
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  if (ext === '.doc') {
    throw new Error('Legacy .doc is not supported; save as .docx or PDF and re-import');
  }

  if (TEXT_EXTENSIONS.has(ext) || ext === '') {
    let text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    if (ext === '.html' || ext === '.htm') {
      text = stripHtml(text);
    } else if (ext === '.rtf') {
      text = stripRtf(text);
    } else if (ext === '.yaml' || ext === '.yml') {
      try {
        const doc = yaml.load(text);
        if (doc && typeof doc === 'object') {
          text = JSON.stringify(doc, null, 2);
        }
      } catch {
        // keep raw yaml text
      }
    }
    return text.trim();
  }

  if (isMostlyText(buffer)) {
    return buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
  }

  throw new Error(`Could not extract text from ${ext || 'this file type'}; try PDF, DOCX, or plain text`);
}

export function isKnowledgePackJson(fileName: string, text: string): boolean {
  if (extensionOf(fileName) !== '.json') return false;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return (
      Array.isArray(parsed.documentation) ||
      Array.isArray(parsed.flows) ||
      Array.isArray(parsed.rules) ||
      Array.isArray(parsed.variables) ||
      Array.isArray(parsed.dependencies)
    );
  } catch {
    return false;
  }
}
