// Dataset Import types

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

export interface ImportTemplate {
  csvHeader: string;
  columns: Array<{
    name: string;
    displayName: string;
    dataType: string;
    required: boolean;
    unique: boolean;
    nullable: boolean;
  }>;
}