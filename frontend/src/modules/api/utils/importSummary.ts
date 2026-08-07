import type { ImportSummary } from '../types';

export type ImportUiOutcome = 'success' | 'warning' | 'error';

export function importSummaryHasChanges(summary: ImportSummary): boolean {
  return (
    summary.servicesImported > 0 ||
    (summary.servicesUpdated ?? 0) > 0 ||
    summary.operationsImported > 0 ||
    (summary.operationsUpdated ?? 0) > 0 ||
    (summary.operationsRemoved ?? 0) > 0
  );
}

export function classifyImportSummary(summary: ImportSummary): ImportUiOutcome {
  const changed = importSummaryHasChanges(summary);
  const warnings = summary.warnings?.filter(Boolean) ?? [];

  if (!changed) {
    return 'error';
  }
  if (warnings.length > 0) {
    return 'warning';
  }
  return 'success';
}

function formatWarningLines(warnings: string[]): string[] {
  return warnings.map((w) => w.trim()).filter(Boolean);
}

export function buildImportSummaryPresentation(summary: ImportSummary): {
  message: string;
  outcome: ImportUiOutcome;
} {
  const outcome = classifyImportSummary(summary);
  const warnings = formatWarningLines(summary.warnings ?? []);
  const lines: string[] = [];

  if (outcome === 'error') {
    lines.push('Import failed.');
    if (warnings.length > 0) {
      lines.push(...warnings);
    } else {
      lines.push('No services or operations were imported from this file.');
    }
    return { message: lines.join('\n\n'), outcome };
  }

  if (summary.servicesImported > 0) {
    lines.push(`✔ ${summary.servicesImported} service${summary.servicesImported === 1 ? '' : 's'} imported`);
  }
  if ((summary.servicesUpdated ?? 0) > 0) {
    lines.push(`✔ ${summary.servicesUpdated} service${summary.servicesUpdated === 1 ? '' : 's'} updated`);
  }
  if (summary.operationsImported > 0) {
    lines.push(`✔ ${summary.operationsImported} operation${summary.operationsImported === 1 ? '' : 's'} added`);
  }
  if ((summary.operationsUpdated ?? 0) > 0) {
    lines.push(`✔ ${summary.operationsUpdated} operation${summary.operationsUpdated === 1 ? '' : 's'} updated`);
  }
  if ((summary.operationsRemoved ?? 0) > 0) {
    lines.push(
      `✔ ${summary.operationsRemoved} operation${summary.operationsRemoved === 1 ? '' : 's'} removed (no longer in spec)`,
    );
  }

  if (warnings.length > 0) {
    warnings.forEach((w) => lines.push(`⚠ ${w}`));
  }

  return { message: lines.join('\n'), outcome };
}

/** @deprecated Use buildImportSummaryPresentation */
export function buildImportSummaryMessage(summary: ImportSummary): string {
  return buildImportSummaryPresentation(summary).message;
}

export function applyImportSummaryToUi(
  summary: ImportSummary,
  handlers: {
    onEnvironments: (envs: ImportSummary['detectedEnvironments']) => void;
    onMessage: (message: string, outcome: ImportUiOutcome) => void;
  },
): void {
  if (summary.detectedEnvironments && summary.detectedEnvironments.length > 0) {
    handlers.onEnvironments(summary.detectedEnvironments);
    return;
  }

  const { message, outcome } = buildImportSummaryPresentation(summary);
  handlers.onMessage(message, outcome);
}
