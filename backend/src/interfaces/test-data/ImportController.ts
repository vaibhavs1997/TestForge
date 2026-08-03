// ImportController - REST Controller for Dataset Import
// Handles multipart/form-data file uploads for importing data into datasets

import { Request, Response } from 'express';
import { ImportDatasetData } from '../../application/test-data/ImportDatasetData';
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';
import { ColumnRepository as ColumnRepositoryImpl } from '../../infrastructure/test-data/ColumnRepository';

export class ImportController {
  constructor(
    private readonly importDatasetData: ImportDatasetData
  ) {}

  async importData(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, datasetId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Parse options from request body
      const options = {
        mode: req.body.mode || 'append',
        onError: req.body.onError || 'stop',
        skipEmptyRows: req.body.skipEmptyRows === 'true',
      };

      // Validate options
      if (!['append', 'replace', 'skipDuplicates'].includes(options.mode)) {
        res.status(400).json({
          success: false,
          message: 'Invalid import mode. Must be: append, replace, or skipDuplicates',
        });
        return;
      }

      if (!['stop', 'continue'].includes(options.onError)) {
        res.status(400).json({
          success: false,
          message: 'Invalid onError option. Must be: stop or continue',
        });
        return;
      }

      // Execute import
      const result = await this.importDatasetData.import(
        projectId,
        datasetId,
        file.buffer,
        file.originalname,
        options
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          data: result,
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Import failed',
        errors: [error.message || 'Unknown error'],
      });
    }
  }

  async getImportTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const columnRepository = new ColumnRepositoryImpl();
      
      const columns = await columnRepository.findByDataset(datasetId);
      
      // Return CSV header template
      const csvHeader = columns.map(col => col.name).join(',');
      
      res.status(200).json({
        success: true,
        data: {
          csvHeader,
          columns: columns.map((col) => ({
            name: col.name,
            displayName: col.displayName,
            dataType: col.dataType,
            required: col.required,
            unique: col.unique,
            nullable: col.nullable,
          })),
        },
      });
    } catch (error: any) {
      console.error('Get template error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get template',
      });
    }
  }
}

export default ImportController;