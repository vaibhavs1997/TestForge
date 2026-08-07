// DataSourceMappingController - Controller for Data Source Mapping endpoints
import { Request, Response } from 'express';
import { CreateDataSourceMapping } from '../../application/test-data/CreateDataSourceMapping';
import { UpdateDataSourceMapping } from '../../application/test-data/UpdateDataSourceMapping';
import { DeleteDataSourceMapping } from '../../application/test-data/DeleteDataSourceMapping';
import { GetDataSourceMapping } from '../../application/test-data/GetDataSourceMapping';
import { ListDataSourceMappings } from '../../application/test-data/ListDataSourceMappings';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class DataSourceMappingController {
    constructor(private readonly createMappingUseCase: CreateDataSourceMapping, private readonly updateMappingUseCase: UpdateDataSourceMapping, private readonly deleteMappingUseCase: DeleteDataSourceMapping, private readonly getMappingUseCase: GetDataSourceMapping, private readonly listMappingsUseCase: ListDataSourceMappings) { }
    async listMappings(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { operationId } = req.query;
        const mappings = await this.listMappingsUseCase.execute({
            projectId,
            operationId: operationId as string | undefined,
        });
        res.status(200).json(createSuccessResponse(mappings));
    }
    async createMapping(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { serviceId, operationId, fieldPath, sourceType, datasetId, datasetColumn, environmentVariable, runtimeOperationId, runtimeField, notes } = req.body;
        const mapping = await this.createMappingUseCase.execute({
            projectId,
            serviceId,
            operationId,
            fieldPath,
            sourceType,
            datasetId,
            datasetColumn,
            environmentVariable,
            runtimeOperationId,
            runtimeField,
            notes,
        });
        res.status(201).json(createSuccessResponse(mapping));
    }
    async getMapping(req: Request, res: Response): Promise<void> {
        const { mappingId } = req.params;
        const mapping = await this.getMappingUseCase.execute(mappingId);
        res.status(200).json(createSuccessResponse(mapping));
    }
    async updateMapping(req: Request, res: Response): Promise<void> {
        const { mappingId } = req.params;
        const { fieldPath, sourceType, datasetId, datasetColumn, environmentVariable, runtimeOperationId, runtimeField, notes } = req.body;
        const mapping = await this.updateMappingUseCase.execute({
            id: mappingId,
            fieldPath,
            sourceType,
            datasetId,
            datasetColumn,
            environmentVariable,
            runtimeOperationId,
            runtimeField,
            notes,
        });
        res.status(200).json(createSuccessResponse(mapping));
    }
    async deleteMapping(req: Request, res: Response): Promise<void> {
        const { mappingId } = req.params;
        await this.deleteMappingUseCase.execute(mappingId);
        res.status(204).send();
    }
}
export default DataSourceMappingController;

