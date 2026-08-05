// RowController - Controller for Dataset Row endpoints
import { Request, Response } from 'express';
import { CreateRow } from '../../application/test-data/CreateRow';
import { UpdateRow } from '../../application/test-data/UpdateRow';
import { DeleteRow } from '../../application/test-data/DeleteRow';
import { GetRow } from '../../application/test-data/GetRow';
import { ListRows } from '../../application/test-data/ListRows';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class RowController {
    constructor(private readonly createRow: CreateRow, private readonly updateRow: UpdateRow, private readonly deleteRow: DeleteRow, private readonly getRow: GetRow, private readonly listRows: ListRows) { }
    async list(req: Request, res: Response): Promise<void> {
        const datasetId = req.query.datasetId as string | undefined;
        if (!datasetId) {
            throw new Error('datasetId is required');
        }
        const rows = await this.listRows.execute(datasetId);
        res.status(200).json(createSuccessResponse(rows));
    }
    async create(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { datasetId, values } = req.body;
        const row = await this.createRow.execute({ projectId, datasetId, values });
        res.status(201).json(createSuccessResponse(row));
    }
    async get(req: Request, res: Response): Promise<void> {
        const { rowId } = req.params;
        const row = await this.getRow.execute(rowId);
        res.status(200).json(createSuccessResponse(row));
    }
    async update(req: Request, res: Response): Promise<void> {
        const { rowId } = req.params;
        const { values } = req.body;
        const row = await this.updateRow.execute({ id: rowId, values });
        res.status(200).json(createSuccessResponse(row));
    }
    async delete(req: Request, res: Response): Promise<void> {
        const { rowId } = req.params;
        await this.deleteRow.execute(rowId);
        res.status(204).send();
    }
}
export default RowController;

