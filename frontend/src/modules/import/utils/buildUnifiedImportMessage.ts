import type { UnifiedImportResult } from './runUnifiedImport';
import {
  buildImportSummaryPresentation,
  importSummaryHasChanges,
  type ImportUiOutcome,
} from '../../api/utils/importSummary';

export function evaluateUnifiedImport(result: UnifiedImportResult): {
  message: string;
  outcome: ImportUiOutcome;
} {
  const lines: string[] = [];
  let hasSuccess = false;
  let hasFailure = false;
  let hasWarning = false;

  for (const r of result.fileResults) {
    if (r.status === 'success') {
      hasSuccess = true;
      lines.push(`✔ ${r.fileName}: ${r.message}`);
    } else if (r.status === 'failed') {
      hasFailure = true;
      lines.push(`✗ ${r.fileName}: ${r.message}`);
    } else {
      hasWarning = true;
      lines.push(`⚠ ${r.fileName}: ${r.message}`);
    }
  }

  if (result.detectedEnvironmentsSynced > 0) {
    hasSuccess = true;
    lines.push(
      `✔ ${result.detectedEnvironmentsSynced} environment(s) synced from API contract(s)`,
    );
  }

  if (result.environmentsUpserted > 0) {
    hasSuccess = true;
    lines.push(`✔ ${result.environmentsUpserted} environment(s) imported from file(s)`);
  }

  const apiTouched = result.apiSummaries.some((s) => importSummaryHasChanges(s));
  const apiWarnings = result.apiSummaries.flatMap((s) => s.warnings ?? []).filter(Boolean);
  if (apiTouched) {
    hasSuccess = true;
  }
  if (apiTouched && apiWarnings.length > 0) {
    hasWarning = true;
    for (const w of apiWarnings) {
      lines.push(`⚠ ${w}`);
    }
  }

  let outcome: ImportUiOutcome = 'success';
  if (hasFailure || (!hasSuccess && (result.fileResults.length > 0 || apiWarnings.length > 0))) {
    outcome = 'error';
    if (!lines.some((l) => l.startsWith('Import failed'))) {
      lines.unshift('Import failed.');
    }
  } else if (hasWarning) {
    outcome = 'warning';
  }

  if (lines.length === 0) {
    lines.push('Import failed.', 'No files were processed.');
    outcome = 'error';
  }

  return { message: lines.join('\n\n'), outcome };
}

export function buildUnifiedImportMessage(result: UnifiedImportResult): string {
  return evaluateUnifiedImport(result).message;
}
