import type { Report } from '../types';

const EXPORTED_REPORT_CSP = "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; img-src 'none'; connect-src 'none'; script-src 'none'; style-src 'unsafe-inline'";

/** Escapes untrusted text for insertion into an HTML text or attribute context. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Creates a self-contained, inert HTML representation of a report.
 * The report is serialized once and escaped as text, so nested API payloads,
 * responses, test names, failures, and all other dynamic values cannot become
 * markup or executable content in the downloaded file.
 */
export function createSafeHtmlReport(report: Report): string {
  const title = report.sections?.overview?.title || report.id || 'TestForge report';
  const serializedReport = JSON.stringify(report, null, 2);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${EXPORTED_REPORT_CSP}">
  <meta name="referrer" content="no-referrer">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — TestForge report</title>
  <style>
    body { margin: 2rem; color: #172033; background: #fff; font-family: system-ui, sans-serif; }
    h1 { margin: 0 0 1rem; font-size: 1.5rem; }
    pre { overflow: auto; margin: 0; padding: 1rem; border: 1px solid #d5dbe5; border-radius: .5rem; background: #f8fafc; white-space: pre-wrap; overflow-wrap: anywhere; font: 0.8125rem/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <pre>${escapeHtml(serializedReport)}</pre>
</body>
</html>`;
}

