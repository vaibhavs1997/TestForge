// DatasetController - Controller for Test Data Library endpoints
import { Request, Response } from 'express';
import { CreateDataset } from '../../application/test-data/CreateDataset.js';
import { UpdateDataset } from '../../application/test-data/UpdateDataset.js';
import { DeleteDataset } from '../../application/test-data/DeleteDataset.js';
import { GetDataset } from '../../application/test-data/GetDataset.js';
import { ListDatasets } from '../../application/test-data/ListDatasets.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class DatasetController {
    constructor(private readonly createDatasetUseCase: CreateDataset, private readonly updateDatasetUseCase: UpdateDataset, private readonly deleteDatasetUseCase: DeleteDataset, private readonly getDatasetUseCase: GetDataset, private readonly listDatasetsUseCase: ListDatasets) { }
    async listDatasets(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const datasets = await this.listDatasetsUseCase.execute({ projectId });
        res.status(200).json(createSuccessResponse(datasets));
    }
    async createDataset(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { name, description, category } = req.body;
        const dataset = await this.createDatasetUseCase.execute({
            projectId,
            name,
            description,
            category,
        });
        res.status(201).json(createSuccessResponse(dataset));
    }
    async getDataset(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { datasetId } = req.params;
        const dataset = await this.getDatasetUseCase.execute({ projectId, id: datasetId });
        res.status(200).json(createSuccessResponse(dataset));
    }
    async updateDataset(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { datasetId } = req.params;
        const { name, description, category } = req.body;
        const dataset = await this.updateDatasetUseCase.execute({
            projectId,
            id: datasetId,
            name,
            description,
            category,
        });
        res.status(200).json(createSuccessResponse(dataset));
    }
    async deleteDataset(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { datasetId } = req.params;
        await this.deleteDatasetUseCase.execute({ projectId, id: datasetId });
        res.status(204).send();
    }
}
export default DatasetController;

