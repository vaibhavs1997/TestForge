import type { ImportSummary } from '../types';

export function buildImportSummaryMessage(summary: ImportSummary): string {
  const lines: string[] = [];
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
  if (lines.length === 0) {
    lines.push('Import completed — contract synced with your project.');
  }
  if (summary.warnings?.length) {
    summary.warnings.forEach((w) => lines.push(`⚠ ${w}`));
  }
  return lines.join('\n');
}

export function applyImportSummaryToUi(
  summary: ImportSummary,
  handlers: {
    onEnvironments: (envs: ImportSummary['detectedEnvironments']) => void;
    onMessage: (message: string) => void;
  },
): void {
  if (summary.detectedEnvironments && summary.detectedEnvironments.length > 0) {
    handlers.onEnvironments(summary.detectedEnvironments);
  } else {
    handlers.onMessage(buildImportSummaryMessage(summary));
  }
}
