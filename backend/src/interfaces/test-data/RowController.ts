// RowController - Controller for Dataset Row endpoints
import { Request, Response } from 'express';
import { CreateRow } from '../../application/test-data/CreateRow';
import { UpdateRow } from '../../application/test-data/UpdateRow';
import { DeleteRow } from '../../application/test-data/DeleteRow';
import { GetRow } from '../../application/test-data/GetRow';
import { ListRows } from '../../application/test-data/ListRows';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class RowController {
  constructor(
    private readonly createRow: CreateRow,
    private readonly updateRow: UpdateRow,
    private readonly deleteRow: DeleteRow,
    private readonly getRow: GetRow,
    private readonly listRows: ListRows
  ) {}

  async list(req: Request, res: Response): Promise<void> {
    try {
      const datasetId = req.query.datasetId as string | undefined;
      if (!datasetId) {
        res.status(400).json(createErrorResponse('datasetId is required', 'VALIDATION_ERROR'));
        return;
      }
      const rows = await this.listRows.execute(datasetId);
      res.status(200).json(createSuccessResponse(rows));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { datasetId, values } = req.body;
      const row = await this.createRow.execute({ projectId, datasetId, values });
      res.status(201).json(createSuccessResponse(row));
    } catch (error: any) {
      if (error.message.includes('required')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      const { rowId } = req.params;
      const row = await this.getRow.execute(rowId);
      res.status(200).json(createSuccessResponse(row));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { rowId } = req.params;
      const { values } = req.body;
      const row = await this.updateRow.execute({ id: rowId, values });
      res.status(200).json(createSuccessResponse(row));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { rowId } = req.params;
      await this.deleteRow.execute(rowId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }
}

export default RowController;