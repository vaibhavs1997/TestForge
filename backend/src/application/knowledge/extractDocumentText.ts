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
    // pdfjs-dist expects browser canvas globals even when it is used for
    // server-side text extraction. Use the native Node implementations that
    // ship with pdf-parse before loading the parser module.
    const nodeGlobals = globalThis as typeof globalThis & {
      DOMMatrix?: any;
      ImageData?: any;
      Path2D?: any;
    };
    try {
      const canvas = await import('@napi-rs/canvas');
      nodeGlobals.DOMMatrix ??= canvas.DOMMatrix;
      nodeGlobals.ImageData ??= canvas.ImageData;
      nodeGlobals.Path2D ??= canvas.Path2D;
    } catch {
      // Text extraction does not need native rendering. pdfjs still touches
      // DOMMatrix while loading, so provide the small matrix surface it needs
      // when the optional platform canvas binary is unavailable.
      nodeGlobals.DOMMatrix ??= class {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;
        m11 = 1;
        m12 = 0;
        m21 = 0;
        m22 = 1;
        m41 = 0;
        m42 = 0;

        constructor(value?: number[]) {
          if (!value) return;
          [this.a, this.b, this.c, this.d, this.e, this.f] = value;
          this.m11 = this.a;
          this.m12 = this.b;
          this.m21 = this.c;
          this.m22 = this.d;
          this.m41 = this.e;
          this.m42 = this.f;
        }
      };
    }

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
