import { apiService } from '../../api/services/apiService';
import type { ImportSummary, DetectedEnvironment } from '../../api/types';
import { parseEnvironmentImport } from '../../environment/utils/parseEnvironmentImport';
import { environmentService } from '../../environment/services/environmentService';
import type { ClassifiedFile, ImportFileKind } from './classifyImportFile';

export interface UnifiedImportFileResult {
  fileName: string;
  kind: ImportFileKind;
  status: 'success' | 'failed' | 'skipped';
  message: string;
}

export interface UnifiedImportResult {
  fileResults: UnifiedImportFileResult[];
  apiSummaries: ImportSummary[];
  environmentsUpserted: number;
  detectedEnvironmentsSynced: number;
}

async function upsertDetectedEnvironments(
  projectId: string,
  envs: DetectedEnvironment[],
): Promise<number> {
  let count = 0;
  for (const env of envs) {
    await environmentService.upsertEnvironment(projectId, {
      name: env.name,
      baseUrl: env.baseUrl,
      description: env.description,
    });
    count += 1;
  }
  return count;
}

export async function runUnifiedImport(
  projectId: string,
  items: ClassifiedFile[],
): Promise<UnifiedImportResult> {
  const fileResults: UnifiedImportFileResult[] = [];
  const apiSummaries: ImportSummary[] = [];
  const detectedFromContracts: DetectedEnvironment[] = [];
  let environmentsUpserted = 0;

  const contracts = items.filter((i) => i.kind === 'api-contract');
  const envFiles = items.filter((i) => i.kind === 'environment');
  const unknown = items.filter((i) => i.kind === 'unknown');

  for (const item of unknown) {
    fileResults.push({
      fileName: item.file.name,
      kind: item.kind,
      status: 'skipped',
      message: 'Skipped — set file type to API contract or Environment',
    });
  }

  for (const item of contracts) {
    try {
      const summary = await apiService.importContract(projectId, item.file);
      apiSummaries.push(summary);
      if (summary.detectedEnvironments?.length) {
        detectedFromContracts.push(...summary.detectedEnvironments);
      }
      fileResults.push({
        fileName: item.file.name,
        kind: item.kind,
        status: 'success',
        message: `Contract synced (${summary.operationsImported + (summary.operationsUpdated ?? 0)} ops touched)`,
      });
    } catch (err) {
      fileResults.push({
        fileName: item.file.name,
        kind: item.kind,
        status: 'failed',
        message: err instanceof Error ? err.message : 'Import failed',
      });
    }
  }

  for (const item of envFiles) {
    try {
      const parsed = await parseEnvironmentImport({ file: item.file });
      for (const env of parsed) {
        await environmentService.upsertEnvironment(projectId, {
          name: env.name,
          baseUrl: env.baseUrl,
          description: env.description,
          variables: env.variables,
          timeout: env.timeout,
        });
        environmentsUpserted += 1;
      }
      fileResults.push({
        fileName: item.file.name,
        kind: item.kind,
        status: 'success',
        message: `${parsed.length} environment${parsed.length === 1 ? '' : 's'} synced`,
      });
    } catch (err) {
      fileResults.push({
        fileName: item.file.name,
        kind: item.kind,
        status: 'failed',
        message: err instanceof Error ? err.message : 'Import failed',
      });
    }
  }

  const seen = new Set<string>();
  const uniqueDetected = detectedFromContracts.filter((e) => {
    const key = `${e.name}-${e.baseUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let detectedEnvironmentsSynced = 0;
  if (uniqueDetected.length > 0) {
    detectedEnvironmentsSynced = await upsertDetectedEnvironments(projectId, uniqueDetected);
  }

  return {
    fileResults,
    apiSummaries,
    environmentsUpserted,
    detectedEnvironmentsSynced,
  };
}
