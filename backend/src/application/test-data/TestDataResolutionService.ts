// TestDataResolutionService - Resolves test data from Data Source Mappings
// Supports: Runtime Variable, Dataset Row, Generated Value, Environment Variable, Manual Value
import { randomUUID } from 'node:crypto';
import { DataSourceMappingRepository } from '../../infrastructure/test-data/DataSourceMappingRepository';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { ColumnRepository } from '../../infrastructure/test-data/ColumnRepository';
import { RuntimeVariableRepository } from '../../infrastructure/knowledge/RuntimeVariableRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { DataSourceMappingEntity } from '../../domain/test-data/DataSourceMappingEntity';
import { DatasetRowEntity } from '../../domain/test-data/DatasetRowEntity';
import { ColumnEntity } from '../../domain/test-data/ColumnEntity';

export interface ResolvedValue {
  sourceType: string;
  value: any;
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
  datasetRow?: DatasetRowEntity;
  sequentialPositions: Map<string, number>;
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
    private readonly environmentRepository: EnvironmentRepository
  ) {}

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

    for (const mapping of mappings) {
      const resolved = await this.resolveMapping(mapping, context);
      resolvedValues[mapping.fieldPath] = resolved;
    }

    return resolvedValues;
  }

  async resolveMapping(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext
  ): Promise<ResolvedValue> {
    const sourceType = mapping.sourceType.toLowerCase();

    // Resolution order: Runtime Variable > Dataset Row > Generated Value > Environment Variable > Manual Value
    switch (sourceType) {
      case 'runtime variable':
        return this.resolveRuntimeVariable(mapping, context);
      
      case 'dataset row':
        return this.resolveDatasetRow(mapping, context);
      
      case 'generated value':
        return this.resolveGeneratedValue(mapping, context);
      
      case 'environment variable':
        return this.resolveEnvironmentVariable(mapping, context);
      
      case 'manual value':
        return this.resolveManualValue(mapping, context);
      
      default:
        return {
          sourceType: mapping.sourceType,
          value: null,
        };
    }
  }

  private async resolveRuntimeVariable(
    mapping: DataSourceMappingEntity,
    context: ResolutionContext
  ): Promise<ResolvedValue> {
    const variableName = mapping.runtimeField || mapping.fieldPath;
    
    if (context.runtimeVariables[variableName] !== undefined) {
      return {
        sourceType: 'Runtime Variable',
        value: context.runtimeVariables[variableName],
        variableName,
      };
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
      const resolved = await this.resolveMapping(mapping, context);
      
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