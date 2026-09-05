// TestDataResolutionService - Resolves test data from Data Source Mappings
// Supports: Runtime Variable, Dataset Row, Generated Value, Environment Variable, Manual Value
import { randomUUID } from 'node:crypto';
import { DataSourceMappingRepository } from '../../infrastructure/test-data/DataSourceMappingRepository.js';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository.js';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository.js';
import { ColumnRepository } from '../../infrastructure/test-data/ColumnRepository.js';
import { RuntimeVariableRepository } from '../../infrastructure/knowledge/RuntimeVariableRepository.js';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository.js';
import { DataSourceMappingEntity } from '../../domain/test-data/DataSourceMappingEntity.js';
import { DatasetRowEntity } from '../../domain/test-data/DatasetRowEntity.js';
import { ColumnEntity } from '../../domain/test-data/ColumnEntity.js';
import type { FieldDataRuleRepository } from '../../domain/test-data/FieldDataRuleRepository.js';
import type { FieldDataRuleEntity, FieldDataSourceReference } from '../../domain/test-data/FieldDataRuleEntity.js';
import type { SecretStore } from '../../domain/security/SecretStore.js';
import { FieldDataResolutionService, OMIT } from './FieldDataResolutionService.js';

export interface ResolvedValue {
  sourceType: string;
  value: any;
  /** Canonical input metadata lets execution adapters apply a value to its real request location. */
  location?: string;
  path?: string;
  sensitive?: boolean;
  sourceReference?: FieldDataSourceReference | null;
  datasetId?: string;
  rowId?: string;
  columnName?: string;
  variableName?: string;
  envVariableName?: string;
  generatedValue?: any;
}

export interface ResolutionContext {
  runtimeVariables: Record<string, any>;
  environmentVariables: Record<string, string>;
  /** Request/suite-run overrides stay transient; exact-version overrides are supplied by the caller. */
  manualOverrides?: Record<string, unknown>;
  testCaseOverrides?: Record<string, unknown>;
  datasetRow?: DatasetRowEntity;
  sequentialPositions: Map<string, number>;
  fieldDataCache?: Map<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class TestDataResolutionService {
  constructor(
    private readonly dataSourceMappingRepository: DataSourceMappingRepository,
    private readonly datasetRowRepository: DatasetRowRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly columnRepository: ColumnRepository,
    private readonly runtimeVariableRepository: RuntimeVariableRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly fieldDataRuleRepository?: FieldDataRuleRepository,
    private readonly secretStore?: SecretStore,
  ) { this.fieldDataResolver = new FieldDataResolutionService(secretStore); }
  private readonly fieldDataResolver: FieldDataResolutionService;

  async getInputRule(projectId: string, operationId: string, path: string, location?: string): Promise<FieldDataRuleEntity | null> {
    if (!this.fieldDataRuleRepository) return null;
    const rules = await this.fieldDataRuleRepository.findByProject(projectId);
    return rules.find((rule) => rule.status === 'ACCEPTED' && rule.input.operationId === operationId && rule.input.path === path
      && (!location || rule.input.location.toUpperCase() === location.toUpperCase())) || null;
  }

  async resolveRequestFields(
    projectId: string,
    serviceId: string,
    operationId: string,
    context: ResolutionContext
  ): Promise<Record<string, ResolvedValue>> {
    const mappings = await this.dataSourceMappingRepository.findByProjectAndOperation(
      projectId,
      serviceId,
      operationId
    );

    const resolvedValues: Record<string, ResolvedValue> = {};
    const projectRules = this.fieldDataRuleRepository ? await this.fieldDataRuleRepository.findByProject(projectId) : [];
    const rules = projectRules.filter((rule) => rule.scopeKind !== 'PROJECT_FALLBACK' && rule.input.operationId === operationId);
    for (const rule of rules.filter((candidate) => candidate.status === 'ACCEPTED')) {
      const resolved = await this.fieldDataResolver.resolve(rule.input, rule, {
        projectId,
        manualOverrides: context.manualOverrides,
        testCaseOverrides: context.testCaseOverrides,
        projectFallbackRules: projectRules.filter((rule) => rule.scopeKind === 'PROJECT_FALLBACK'),
        linkedValues: context.runtimeVariables,
        environmentValues: context.environmentVariables,
        cache: context.fieldDataCache ?? new Map<string, unknown>(),
      });
      if (resolved.value !== OMIT) {
        resolvedValues[rule.input.path] = {
          sourceType: resolved.sourceStrategy,
          value: resolved.value,
          location: rule.input.location,
          path: rule.input.path,
          sensitive: resolved.sensitive,
          sourceReference: rule.sourceReference,
        };
      }
    }

    for (const mapping of mappings) {
      if (resolvedValues[mapping.fieldPath]) continue;
      const resolved = await this.resolveMapping(mapping, context, projectId);
      resolvedValues[mapping.fieldPath] = resolved;
    }

    return resolvedValues;
  }

  private async resolveRule(rule: FieldDataRuleEntity, context: ResolutionContext, projectId: string): Promise<ResolvedValue> {
    const source = (rule.sourceReference || {}) as FieldDataSourceReference;
    if (!rule.required && rule.optionalFieldPolicy === 'OMIT') return { sourceType: rule.valueStrategy, value: undefined };
    if (!rule.required && rule.optionalFieldPolicy === 'EMPTY') return { sourceType: rule.valueStrategy, value: '' };
    if (!rule.required && rule.optionalFieldPolicy === 'NULL') return { sourceType: rule.valueStrategy, value: null };
    switch (rule.valueStrategy) {
      case 'FIXED': case 'MANUAL': case 'CONTRACT_DEFAULT': return { sourceType: rule.valueStrategy, value: source.value };
      case 'GENERATE': return { sourceType: 'Generated Value', value: this.generateDefaultValue(rule.input.path) };
      case 'REUSE': case 'LINKED_RESPONSE': return { sourceType: rule.valueStrategy, value: context.runtimeVariables[String(source.field || rule.input.path)], variableName: String(source.field || rule.input.path) };
      case 'ENVIRONMENT': return { sourceType: 'Environment Variable', value: context.environmentVariables[String(source.field || rule.input.path)], envVariableName: String(source.field || rule.input.path) };
      case 'SECRET': {
        const secretRef = String(source.secretRef || source.id || '');
        if (!this.secretStore || !secretRef) throw new Error(`Secret rule for ${rule.input.path} has no resolvable secret reference`);
        if ((await this.secretStore.metadata(secretRef))?.projectId !== projectId) throw new Error('Secret is not available in this project');
        const value = await this.secretStore.get(secretRef); if (value === null) throw new Error(`Secret ${secretRef} could not be resolved`); return { sourceType: 'Secret', value };
      }
      case 'DATASET': return this.resolveDatasetRow({ fieldPath: rule.input.path, sourceType: 'Dataset Row', datasetId: String(source.datasetId || source.id || ''), datasetColumn: String(source.field || '') } as DataSourceMappingEntity, context);
    }
  }

  async resolveMapping(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext,
    projectId?: string,
  ): Promise<ResolvedValue> {
    try {
      const sourceType = mapping.sourceType.toLowerCase();

      // Resolution order: Runtime Variable > Dataset Row > Generated Value > Environment Variable > Manual Value
      switch (sourceType) {
        case 'runtime variable':
          return await this.resolveRuntimeVariable(mapping, context, projectId);
        case 'dataset row':
          return await this.resolveDatasetRow(mapping, context);
        case 'generated value':
          return await this.resolveGeneratedValue(mapping, context);
        case 'environment variable':
          return await this.resolveEnvironmentVariable(mapping, context);
        case 'manual value':
          return await this.resolveManualValue(mapping, context);
        default:
          return { sourceType: mapping.sourceType, value: null };
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to resolve ${mapping.sourceType} for field "${mapping.fieldPath}": ${detail}`);
    }
  }

  private async resolveRuntimeVariable(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext,
    projectId?: string,
  ): Promise<ResolvedValue> {
    const variableName = mapping.runtimeField || mapping.fieldPath;
    
    if (context.runtimeVariables[variableName] !== undefined) {
      return {
        sourceType: 'Runtime Variable',
        value: context.runtimeVariables[variableName],
        variableName,
      };
    }

    if (projectId) {
      const variable = (await this.runtimeVariableRepository.findByProject(projectId))
        .find((candidate) => candidate.name === variableName);
      if (variable?.defaultValue !== undefined && variable.defaultValue !== '') {
        return { sourceType: 'Runtime Variable', value: variable.defaultValue, variableName };
      }
    }

    return {
      sourceType: 'Runtime Variable',
      value: null,
      variableName,
    };
  }

  private async resolveDatasetRow(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext
  ): Promise<ResolvedValue> {
    if (!mapping.datasetId || !mapping.datasetColumn) {
      return {
        sourceType: 'Dataset Row',
        value: null,
      };
    }

    const dataset = await this.datasetRepository.findById(mapping.datasetId);
    if (!dataset) {
      return {
        sourceType: 'Dataset Row',
        value: null,
        datasetId: mapping.datasetId,
      };
    }

    // Get row selection strategy (default to first row)
    const selectionStrategy = mapping.notes?.toLowerCase() || 'first row';
    let row: DatasetRowEntity | null = null;

    const rows = await this.datasetRowRepository.list(mapping.datasetId);
    
    if (rows.length === 0) {
      return {
        sourceType: 'Dataset Row',
        value: null,
        datasetId: mapping.datasetId,
      };
    }

    switch (selectionStrategy) {
      case 'random row':
        row = rows[Math.floor(Math.random() * rows.length)];
        break;
      
      case 'sequential row':
        const positionKey = `${mapping.datasetId}-${mapping.datasetColumn}`;
        const currentPosition = context.sequentialPositions.get(positionKey) || 0;
        row = rows[currentPosition % rows.length];
        context.sequentialPositions.set(positionKey, currentPosition + 1);
        break;
      
      case 'row by filter':
        // Future placeholder - for now fall back to first row
      case 'first row':
      default:
        row = rows[0];
        break;
    }

    if (!row) {
      return {
        sourceType: 'Dataset Row',
        value: null,
        datasetId: mapping.datasetId,
      };
    }

    const value = row.values[mapping.datasetColumn];
    return {
      sourceType: 'Dataset Row',
      value,
      datasetId: mapping.datasetId,
      rowId: row.id,
      columnName: mapping.datasetColumn,
    };
  }

  private async resolveGeneratedValue(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext
  ): Promise<ResolvedValue> {
    if (!mapping.datasetId || !mapping.datasetColumn) {
      return {
        sourceType: 'Generated Value',
        value: null,
      };
    }

    const columns = await this.columnRepository.findByDataset(mapping.datasetId);
    const column = columns.find(c => c.name === mapping.datasetColumn);

    if (!column) {
      return {
        sourceType: 'Generated Value',
        value: this.generateDefaultValue(mapping.datasetColumn),
        columnName: mapping.datasetColumn,
      };
    }

    const generatedValue = this.generateValueFromColumn(column);
    return {
      sourceType: 'Generated Value',
      value: generatedValue,
      columnName: mapping.datasetColumn,
      generatedValue,
    };
  }

  private async resolveEnvironmentVariable(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext
  ): Promise<ResolvedValue> {
    const envVarName = mapping.environmentVariable || mapping.fieldPath;
    
    if (context.environmentVariables[envVarName] !== undefined) {
      return {
        sourceType: 'Environment Variable',
        value: context.environmentVariables[envVarName],
        envVariableName: envVarName,
      };
    }

    return {
      sourceType: 'Environment Variable',
      value: null,
      envVariableName: envVarName,
    };
  }

  private async resolveManualValue(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext
  ): Promise<ResolvedValue> {
    // Manual values are stored in the mapping configuration or notes
    const manualValue = mapping.notes || mapping.fieldPath;
    return {
      sourceType: 'Manual Value',
      value: manualValue,
    };
  }

  private generateValueFromColumn(column: ColumnEntity): any {
    switch (column.dataType.toLowerCase()) {
      case 'string':
        return `generated_${column.name}_${Date.now()}`;
      case 'number':
      case 'integer':
        return Math.floor(Math.random() * 1000);
      case 'boolean':
        return Math.random() > 0.5;
      case 'email':
        return `test${Date.now()}@example.com`;
      case 'uuid':
        return randomUUID();
      default:
        return `generated_${column.name}`;
    }
  }

  private generateDefaultValue(columnName: string): any {
    return `generated_${columnName}_${Date.now()}`;
  }

  async validateMappings(
    projectId: string,
    serviceId: string,
    operationId: string,
    context: ResolutionContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const mappings = await this.dataSourceMappingRepository.findByProjectAndOperation(
      projectId,
      serviceId,
      operationId
    );

    for (const mapping of mappings) {
      const resolved = await this.resolveMapping(mapping, context, projectId);
      
      if (resolved.value === null || resolved.value === undefined) {
        errors.push({
          field: mapping.fieldPath,
          message: `Failed to resolve ${mapping.sourceType} for field "${mapping.fieldPath}"`,
          severity: 'error',
        });
      }

      // Validate dataset row exists
      if (mapping.sourceType === 'Dataset Row' && mapping.datasetId) {
        const dataset = await this.datasetRepository.findById(mapping.datasetId);
        if (!dataset) {
          errors.push({
            field: mapping.fieldPath,
            message: `Dataset ${mapping.datasetId} not found`,
            severity: 'error',
          });
        } else {
          const rows = await this.datasetRowRepository.list(mapping.datasetId);
          if (rows.length === 0) {
            errors.push({
              field: mapping.fieldPath,
              message: `Dataset "${dataset.name}" has no rows`,
              severity: 'error',
            });
          }
        }
      }

      // Validate required columns
      if (mapping.sourceType === 'Dataset Row' && mapping.datasetId && mapping.datasetColumn) {
      const columns = await this.columnRepository.findByDataset(mapping.datasetId);
        const column = columns.find(c => c.name === mapping.datasetColumn);
        
        if (column && column.required) {
          const rows = await this.datasetRowRepository.list(mapping.datasetId);
          const hasEmptyValues = rows.some(row => {
            const value = row.values[mapping.datasetColumn!];
            return value === null || value === undefined || value === '';
          });

          if (hasEmptyValues) {
            errors.push({
              field: mapping.fieldPath,
              message: `Required column "${mapping.datasetColumn}" has empty values`,
              severity: 'error',
            });
          }
        }
      }
    }

    return errors;
  }
}

export default TestDataResolutionService;
