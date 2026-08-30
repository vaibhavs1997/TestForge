import type { Report } from '../types';

const CSP = "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; img-src 'none'; connect-src 'none'; script-src 'none'; style-src 'unsafe-inline'";

export interface SafeHtmlReportContext {
  suiteName?: string | null;
  ticketReference?: string | null;
  testCaseStatements?: Record<string, string>;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const formatDuration = (milliseconds: number): string => {
  if (!milliseconds) return '—';
  if (milliseconds < 1000) return `${milliseconds}ms`;
  return `${(milliseconds / 1000).toFixed(1)}s`;
};

const formatValue = (value: unknown, fallback = '—'): string => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};

export function createSafeHtmlReport(report: Report, context: SafeHtmlReportContext = {}): string {
  const steps = report.sections?.stepResults || [];
  const suite = context.suiteName || report.suiteId || 'Individual execution';
  const ticket = context.ticketReference || report.requirementIds?.[0] || 'Not linked';
  const overallStatusClass = report.overallStatus === 'Passed' ? 'status-pass' : report.overallStatus === 'Failed' ? 'status-fail' : 'status-neutral';
  const detail = (label: string, value: unknown, tone = '') => `<div class="header-detail"><span>${escapeHtml(label)}</span><strong class="${tone}">${escapeHtml(value ?? '—')}</strong></div>`;

  const results = steps.map((step: any, index: number) => {
    const isPassed = step.status === 'Passed';
    const status = String(step.status || 'Unknown');
    const statement = context.testCaseStatements?.[step.stepId]
      || step.statement
      || step.testCaseStatement
      || step.name
      || step.title
      || 'Executed API validation';
    const assertions = (step.assertions || []).map((assertion: any) => {
      const passed = assertion.passed === true || assertion.status === 'Passed';
      return `<tr><td class="result-mark ${passed ? 'pass' : 'fail'}">${passed ? '&#10003;' : '&#10005;'}</td><td>${escapeHtml(assertion.name || assertion.description || 'Assertion')}</td><td>${escapeHtml(formatValue(assertion.expected))}</td><td>${escapeHtml(formatValue(assertion.actual))}</td></tr>`;
    }).join('');

    return `<details class="test-case ${isPassed ? 'test-case-pass' : 'test-case-fail'}"><summary><div class="case-heading"><span class="case-number">Test Case ${index + 1}</span><strong>${escapeHtml(statement)}</strong></div><span class="case-status ${isPassed ? 'status-pass' : 'status-fail'}">Status: ${escapeHtml(status)} <span aria-hidden="true">&#8250;</span></span></summary><div class="case-content"><section class="metrics"><div><label>Request</label><p><b>${escapeHtml(step.request?.method || '')}</b> ${escapeHtml(step.request?.url || '—')}</p></div><div><label>Response status</label><p class="${step.response?.status >= 400 ? 'fail' : 'pass'}">${escapeHtml(step.response?.status ?? '—')}</p></div><div><label>Duration</label><p>${escapeHtml(formatDuration(step.response?.duration || 0))}</p></div><div><label>Started</label><p>${step.startedAt ? escapeHtml(new Date(step.startedAt).toLocaleString()) : '—'}</p></div></section>${step.error ? `<p class="error-message">${escapeHtml(step.error)}</p>` : ''}${assertions ? `<section class="assertions"><h3>Assertions</h3><table><thead><tr><th></th><th>Assertion</th><th>Expected</th><th>Actual</th></tr></thead><tbody>${assertions}</tbody></table></section>` : ''}<section class="payload-grid"><details class="payload"><summary>Request Payload <span aria-hidden="true">&#8250;</span></summary><pre>${escapeHtml(formatValue(step.request?.body, 'No request payload'))}</pre></details><details class="payload response-payload"><summary>Response Body <span aria-hidden="true">&#8250;</span></summary><pre>${escapeHtml(formatValue(step.response?.body, 'No response body'))}</pre></details></section></div></details>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><title>TestForge execution report</title><style>
    *{box-sizing:border-box}body{margin:0;padding:30px;background:#f8f7fc;color:#26234c;font:14px/1.5 Arial,sans-serif}main{max-width:1180px;margin:auto}.report-header{padding:24px;border:1px solid #e5e2f0;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(48,45,120,.08)}.kicker{color:#625f83;font-size:11px;font-weight:bold;letter-spacing:.12em}.report-header h1{margin:5px 0 4px;font-size:26px}.report-header p{margin:0;color:#625f83}.overall-status{display:inline-block;margin-top:10px;padding:5px 10px;border-radius:999px;font-weight:bold}.status-pass{color:#167348;background:#edf9f1}.status-fail{color:#c63d42;background:#fff0f0}.status-neutral{color:#625f83;background:#f0edff}.header-details{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}.header-detail{padding:11px;border:1px solid #e5e2f0;border-radius:10px;background:#faf9ff}.header-detail span,.metrics label{display:block;margin-bottom:5px;color:#625f83;font-size:10px;font-weight:bold;letter-spacing:.05em;text-transform:uppercase}.header-detail strong{display:block;overflow-wrap:anywhere}.pass{color:#167348}.fail{color:#c63d42}.test-results-title{margin:28px 0 12px;font-size:18px}.test-case{margin:14px 0;border:1px solid #e5e2f0;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 4px 14px rgba(48,45,120,.06)}.test-case>summary{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;padding:17px 20px;border-left:6px solid #c63d42;background:linear-gradient(90deg,#fff7f7,#fff)}.test-case-pass>summary{border-left-color:#167348;background:linear-gradient(90deg,#f1fbf6,#fff)}summary::-webkit-details-marker{display:none}.case-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px}.case-number{color:#625f83;font-size:12px;font-weight:bold;text-transform:uppercase}.case-heading strong{font-size:16px}.case-status{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:bold;white-space:nowrap}.test-case[open]>.case-status span,.payload[open]>summary span{display:inline-block;transform:rotate(90deg)}.case-content{padding:16px 20px 20px;border-top:1px solid #e5e2f0}.metrics{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:10px;padding:14px;border:1px solid #e5e2f0;border-radius:12px;background:#f8f7fc}.metrics>div{min-width:0;padding-left:10px;border-left:2px solid #ded9f3}.metrics>div:first-child{border-left-color:#302d78}.metrics p{margin:0;font-weight:600;overflow-wrap:anywhere}.error-message{margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#fff0f0;color:#c63d42}.assertions{margin-top:14px;padding:14px;border:1px solid #e5e2f0;border-radius:12px}.assertions h3{margin:0 0 10px;color:#302d78;font-size:15px}.assertions table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #e5e2f0;border-radius:8px}.assertions th,.assertions td{padding:9px;border-width:0 0 1px 1px;border-style:solid;border-color:#e5e2f0;text-align:left}.assertions th:first-child,.assertions td:first-child{border-left:0}.assertions tr:last-child td{border-bottom:0}.assertions th{background:#eeecfa;color:#4d497a;font-size:10px;letter-spacing:.04em;text-transform:uppercase}.result-mark{width:30px;font-size:16px}.payload-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.payload{border:1px solid #e5e2f0;border-radius:12px;overflow:hidden;background:#fff}.payload>summary{cursor:pointer;list-style:none;padding:12px 14px;color:#302d78;background:#f0edff;font-weight:bold}.response-payload>summary{color:#167348;background:#edf9f1}.payload summary span{float:right;transition:transform .15s}.payload pre{max-height:250px;margin:0;padding:14px;overflow:auto;background:#fbfaff;color:#403d62;white-space:pre-wrap;word-break:break-word;font:12px/1.45 Consolas,monospace}@media(max-width:760px){body{padding:16px}.header-details,.metrics,.payload-grid{grid-template-columns:1fr 1fr}.test-case>summary{align-items:flex-start;flex-direction:column}}@media print{body{padding:12px;background:#fff}.report-header,.test-case{box-shadow:none;break-inside:avoid}.test-case:not([open]) .case-content{display:none}}
  </style></head><body><main><header class="report-header"><div class="kicker">TESTFORGE · EXECUTION REPORT</div><h1>${escapeHtml(report.sections?.overview?.title || report.id)}</h1><p>Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</p><div class="overall-status ${overallStatusClass}">Status: ${escapeHtml(report.overallStatus)}</div><section class="header-details">${detail('Suite', suite)}${detail('Ticket / requirement', ticket)}${detail('Run ID', report.executionRunId)}${detail('Total test cases', report.totalSteps)}${detail('Passed', report.passedSteps, 'pass')}${detail('Failed', report.failedSteps, 'fail')}${detail('Duration', formatDuration(report.executionDuration))}${detail('Environment', report.environment?.name)}</section></header><h2 class="test-results-title">Individual test results</h2>${results || '<p>No test results are available.</p>'}</main></body></html>`;
}
