// ImportDatasetData - Application Use Case for importing data into datasets
// Supports CSV, Excel, and JSON Array formats
// Reuses existing Dataset, Column, and Dataset Row repositories

import { DatasetRepository } from '../../domain/test-data/DatasetRepository';
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';
import { IDatasetRowRepository } from '../../domain/test-data/DatasetRowRepository';
import { IRelationshipRepository } from '../../domain/test-data/RelationshipRepository';
import { DatasetEntity } from '../../domain/test-data/DatasetEntity';
import { ColumnEntity } from '../../domain/test-data/ColumnEntity';
import { DatasetRowEntity } from '../../domain/test-data/DatasetRowEntity';

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  matched: boolean;
  suggestion?: string;
}

export interface ImportOptions {
  mode: 'append' | 'replace' | 'skipDuplicates';
  onError: 'stop' | 'continue';
  skipEmptyRows: boolean;
}

export interface ImportResult {
  success: boolean;
  rowsImported: number;
  rowsSkipped: number;
  rowsFailed: number;
  duplicatesSkipped: number;
  columnMapping: ColumnMapping[];
  warnings: string[];
  errors: string[];
  message: string;
}

export class ImportDatasetData {
  constructor(
    private readonly datasetRepository: DatasetRepository,
    private readonly columnRepository: ColumnRepository,
    private readonly datasetRowRepository: IDatasetRowRepository,
    private readonly relationshipRepository: IRelationshipRepository
  ) {}

  async import(
    projectId: string,
    datasetId: string,
    fileContent: Buffer,
    fileName: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      rowsImported: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      duplicatesSkipped: 0,
      columnMapping: [],
      warnings: [],
      errors: [],
      message: '',
    };

    try {
      // Step 1: Validate dataset exists
      const dataset = await this.datasetRepository.findById(datasetId);
      if (!dataset) {
        result.errors.push(`Dataset with ID ${datasetId} not found`);
        result.message = 'Dataset not found';
        return result;
      }

      // Step 2: Read and parse file
      let parsedData: Record<string, any>[] = [];
      let detectedColumns: string[] = [];

      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        const parseResult = this.parseCSV(fileContent);
        parsedData = parseResult.data;
        detectedColumns = parseResult.columns;
      } else if (fileExtension === 'json') {
        const parseResult = this.parseJSON(fileContent);
        parsedData = parseResult.data;
        detectedColumns = parseResult.columns;
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Excel parsing would require a library like xlsx
        // For now, return an error
        result.errors.push('Excel format not yet supported. Please use CSV or JSON.');
        result.message = 'Excel format not supported';
        return result;
      } else {
        result.errors.push(`Unsupported file format: ${fileExtension}`);
        result.message = 'Unsupported file format';
        return result;
      }

      // Step 3: Get dataset columns
      const datasetColumns = await this.columnRepository.findByDataset(datasetId);

      // Step 4: Match columns
      result.columnMapping = this.matchColumns(detectedColumns, datasetColumns);

      // Check for unmatched columns
      const unmappedColumns = result.columnMapping.filter(m => !m.matched);
      if (unmappedColumns.length > 0) {
        result.warnings.push(`Unmapped columns: ${unmappedColumns.map(m => m.sourceColumn).join(', ')}`);
      }

      // Step 5: Handle replace mode
      if (options.mode === 'replace') {
        // Delete existing rows
        const existingRows = await this.datasetRowRepository.list(datasetId);
        for (const row of existingRows) {
          await this.datasetRowRepository.delete(row.id);
        }
        result.warnings.push(`Replaced ${existingRows.length} existing rows`);
      }

      // Step 6: Import rows
      const existingValues = await this.getExistingValues(datasetId, datasetColumns);

      for (let i = 0; i < parsedData.length; i++) {
        const rowData = parsedData[i];
        const rowNumber = i + 2; // Account for header row

        try {
          // Skip empty rows if option is set
          if (options.skipEmptyRows && this.isEmptyRow(rowData)) {
            result.rowsSkipped++;
            continue;
          }

          // Map columns
          const mappedRow: Record<string, any> = {};
          for (const mapping of result.columnMapping) {
            if (mapping.matched && rowData[mapping.sourceColumn] !== undefined) {
              mappedRow[mapping.targetColumn] = rowData[mapping.sourceColumn];
            }
          }

          // Validate required columns
          const validationError = this.validateRow(mappedRow, datasetColumns);
          if (validationError) {
            result.errors.push(`Row ${rowNumber}: ${validationError}`);
            result.rowsFailed++;
            if (options.onError === 'stop') {
              result.message = `Import stopped at row ${rowNumber}: ${validationError}`;
              return result;
            }
            continue;
          }

          // Check for duplicates if mode is skipDuplicates
          if (options.mode === 'skipDuplicates') {
            const isDuplicate = this.checkDuplicate(mappedRow, existingValues, datasetColumns);
            if (isDuplicate) {
              result.rowsSkipped++;
              result.duplicatesSkipped++;
              continue;
            }
          }

          // Create row
          const newRow = new DatasetRowEntity(
            crypto.randomUUID(),
            projectId,
            datasetId,
            mappedRow,
            Date.now(),
            Date.now()
          );

          await this.datasetRowRepository.create(newRow);
          result.rowsImported++;

          // Add to existing values for duplicate checking
          existingValues.push(mappedRow);

        } catch (error: any) {
          result.errors.push(`Row ${rowNumber}: ${error.message || 'Unknown error'}`);
          result.rowsFailed++;
          if (options.onError === 'stop') {
            result.message = `Import stopped at row ${rowNumber}: ${error.message}`;
            return result;
          }
        }
      }

      // Update dataset row count
      const updatedDataset = new DatasetEntity(
        dataset.id,
        dataset.projectId,
        dataset.name,
        dataset.description,
        dataset.category,
        dataset.rowCount + result.rowsImported,
        dataset.createdAt,
        Date.now()
      );
      await this.datasetRepository.update(dataset.id, updatedDataset);

      result.success = true;
      result.message = `Import completed: ${result.rowsImported} rows imported, ${result.rowsFailed} failed, ${result.rowsSkipped} skipped`;

    } catch (error: any) {
      result.message = `Import failed: ${error.message || 'Unknown error'}`;
      result.errors.push(error.message || 'Unknown error');
    }

    return result;
  }

  private parseCSV(content: Buffer): { data: Record<string, any>[]; columns: string[] } {
    const text = content.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      return { data: [], columns: [] };
    }

    // Parse header
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
    const data: Record<string, any>[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Try to convert to number if possible
        const numValue = Number(value);
        row[header] = !isNaN(numValue) && value.trim() !== '' ? numValue : value;
      });

      data.push(row);
    }

    return { data, columns: headers };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private parseJSON(content: Buffer): { data: Record<string, any>[]; columns: string[] } {
    const text = content.toString('utf-8');
    const json = JSON.parse(text);

    if (!Array.isArray(json)) {
      throw new Error('JSON must be an array of objects');
    }

    if (json.length === 0) {
      return { data: [], columns: [] };
    }

    // Extract columns from first object
    const columns = Object.keys(json[0]);
    const data = json.map(item => {
      const row: Record<string, any> = {};
      for (const key of columns) {
        row[key] = item[key];
      }
      return row;
    });

    return { data, columns };
  }

  private matchColumns(
    sourceColumns: string[],
    datasetColumns: ColumnEntity[]
  ): ColumnMapping[] {
    return sourceColumns.map(sourceCol => {
      const normalizedSource = sourceCol.toLowerCase().trim();
      
      // Try exact match first
      let match = datasetColumns.find(col => 
        col.name.toLowerCase() === normalizedSource
      );

      // Try case-insensitive match
      if (!match) {
        match = datasetColumns.find(col => 
          col.name.toLowerCase().replace(/\s+/g, '') === normalizedSource.replace(/\s+/g, '')
        );
      }

      // Try fuzzy match (contains)
      if (!match) {
        match = datasetColumns.find(col => {
          const normalizedCol = col.name.toLowerCase().replace(/\s+/g, '');
          const normalizedSourceClean = normalizedSource.replace(/\s+/g, '');
          return normalizedCol.includes(normalizedSourceClean) || 
                 normalizedSourceClean.includes(normalizedCol);
        });
      }

      if (match) {
        return {
          sourceColumn: sourceCol,
          targetColumn: match.name,
          matched: true,
        };
      } else {
        // Find closest match as suggestion
        const suggestion = this.findClosestMatch(normalizedSource, datasetColumns);
        return {
          sourceColumn: sourceCol,
          targetColumn: sourceCol, // Use source as fallback
          matched: false,
          suggestion,
        };
      }
    });
  }

  private findClosestMatch(source: string, columns: ColumnEntity[]): string | undefined {
    let closestMatch: string | undefined;
    let closestDistance = Infinity;

    for (const col of columns) {
      const normalizedCol = col.name.toLowerCase().replace(/\s+/g, '');
      const distance = this.levenshteinDistance(source.replace(/\s+/g, ''), normalizedCol);
      
      if (distance < closestDistance && distance <= 3) {
        closestDistance = distance;
        closestMatch = col.name;
      }
    }

    return closestMatch;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private async getExistingValues(
    datasetId: string,
    columns: ColumnEntity[]
  ): Promise<Record<string, any>[]> {
    const rows = await this.datasetRowRepository.list(datasetId);
    const uniqueColumns = columns.filter(col => col.unique);
    
    return rows.map((row) => {
      const values: Record<string, any> = {};
      for (const col of uniqueColumns) {
        values[col.name] = row.values[col.name];
      }
      return values;
    });
  }

  private isEmptyRow(row: Record<string, any>): boolean {
    return Object.values(row).every(value => 
      value === null || value === undefined || value === ''
    );
  }

  private validateRow(
    row: Record<string, any>,
    columns: ColumnEntity[]
  ): string | null {
    for (const col of columns) {
      const value = row[col.name];

      // Check required columns
      if (col.required && (value === null || value === undefined || value === '')) {
        return `Required column "${col.name}" is missing`;
      }

      // Check nullable
      if (!col.nullable && (value === null || value === undefined)) {
        return `Column "${col.name}" cannot be null`;
      }
    }

    return null;
  }

  private checkDuplicate(
    row: Record<string, any>,
    existingValues: Record<string, any>[],
    columns: ColumnEntity[]
  ): boolean {
    const uniqueColumns = columns.filter(col => col.unique);
    
    if (uniqueColumns.length === 0) {
      return false;
    }

    return existingValues.some(existing => {
      return uniqueColumns.every(col => {
        return existing[col.name] === row[col.name];
      });
    });
  }
}

export default ImportDatasetData;