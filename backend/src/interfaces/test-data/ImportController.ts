// ImportController - REST Controller for Dataset Import
// Handles multipart/form-data file uploads for importing data into datasets
import { Request, Response } from 'express';
import { ImportDatasetData } from '../../application/test-data/ImportDatasetData';
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';
import { ColumnRepository as ColumnRepositoryImpl } from '../../infrastructure/test-data/ColumnRepository';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class ImportController {
    constructor(private readonly importDatasetData: ImportDatasetData) { }
    async importData(req: Request, res: Response): Promise<void> {
        const { projectId, datasetId } = req.params;
        const file = req.file;
        if (!file) {
            throw new Error('No file uploaded');
        }
        // Parse options from request body
        const options = {
            mode: req.body.mode || 'append',
            onError: req.body.onError || 'stop',
            skipEmptyRows: req.body.skipEmptyRows === 'true',
        };
        // Validate options
        if (!['append', 'replace', 'skipDuplicates'].includes(options.mode)) {
            throw new Error('Invalid import mode. Must be: append, replace, or skipDuplicates');
        }
        if (!['stop', 'continue'].includes(options.onError)) {
            throw new Error('Invalid onError option. Must be: stop or continue');
        }
        // Execute import
        const result = await this.importDatasetData.import(projectId, datasetId, file.buffer, file.originalname, options);
        if (result.success) {
            res.status(200).json(createSuccessResponse(result));
        }
        else {
            throw new Error((result).message || "Request failed");
        }
    }
    async getImportTemplate(req: Request, res: Response): Promise<void> {
        const { datasetId } = req.params;
        const columnRepository = new ColumnRepositoryImpl();
        const columns = await columnRepository.findByDataset(datasetId);
        // Return CSV header template
        const csvHeader = columns.map(col => col.name).join(',');
        res.status(200).json(createSuccessResponse({
            csvHeader,
            columns: columns.map((col) => ({
                name: col.name,
                displayName: col.displayName,
                dataType: col.dataType,
                required: col.required,
                unique: col.unique,
                nullable: col.nullable,
            })),
        }));
    }
}
export default ImportController;

