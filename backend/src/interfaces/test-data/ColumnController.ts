// ColumnController - Controller for Dataset Column endpoints
import { Request, Response } from 'express';
import { CreateColumn } from '../../application/test-data/CreateColumn';
import { UpdateColumn } from '../../application/test-data/UpdateColumn';
import { DeleteColumn } from '../../application/test-data/DeleteColumn';
import { GetColumn } from '../../application/test-data/GetColumn';
import { ListColumns } from '../../application/test-data/ListColumns';
import { SuggestColumns } from '../../application/test-data/SuggestColumns';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class ColumnController {
    constructor(private readonly createColumnUseCase: CreateColumn, private readonly updateColumnUseCase: UpdateColumn, private readonly deleteColumnUseCase: DeleteColumn, private readonly getColumnUseCase: GetColumn, private readonly listColumnsUseCase: ListColumns, private readonly suggestColumnsUseCase: SuggestColumns) { }
    async listColumns(req: Request, res: Response): Promise<void> {
        const { datasetId } = req.query;
        const columns = await this.listColumnsUseCase.execute({
            datasetId: datasetId as string | undefined,
        });
        res.status(200).json(createSuccessResponse(columns));
    }
    async createColumn(req: Request, res: Response): Promise<void> {
        const { datasetId, name, displayName, dataType, required, unique, nullable, description } = req.body;
        const column = await this.createColumnUseCase.execute({
            datasetId,
            name,
            displayName,
            dataType,
            required: required || false,
            unique: unique || false,
            nullable: nullable !== undefined ? nullable : true,
            description,
        });
        res.status(201).json(createSuccessResponse(column));
    }
    async getColumn(req: Request, res: Response): Promise<void> {
        const { columnId } = req.params;
        const column = await this.getColumnUseCase.execute(columnId);
        res.status(200).json(createSuccessResponse(column));
    }
    async updateColumn(req: Request, res: Response): Promise<void> {
        const { columnId } = req.params;
        const { name, displayName, dataType, required, unique, nullable, description } = req.body;
        const column = await this.updateColumnUseCase.execute({
            id: columnId,
            name,
            displayName,
            dataType,
            required,
            unique,
            nullable,
            description,
        });
        res.status(200).json(createSuccessResponse(column));
    }
    async deleteColumn(req: Request, res: Response): Promise<void> {
        const { columnId } = req.params;
        await this.deleteColumnUseCase.execute(columnId);
        res.status(204).send();
    }
    async suggestColumns(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { datasetName } = req.query;
        const result = await this.suggestColumnsUseCase.execute({
            projectId,
            datasetName: datasetName as string,
        });
        res.status(200).json(createSuccessResponse(result));
    }
}
export default ColumnController;

