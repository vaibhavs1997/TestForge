// DataSourceMappingController - Controller for Data Source Mapping endpoints
import { Request, Response } from 'express';
import { CreateDataSourceMapping } from '../../application/test-data/CreateDataSourceMapping';
import { UpdateDataSourceMapping } from '../../application/test-data/UpdateDataSourceMapping';
import { DeleteDataSourceMapping } from '../../application/test-data/DeleteDataSourceMapping';
import { GetDataSourceMapping } from '../../application/test-data/GetDataSourceMapping';
import { ListDataSourceMappings } from '../../application/test-data/ListDataSourceMappings';

export class DataSourceMappingController {
  constructor(
    private readonly createMappingUseCase: CreateDataSourceMapping,
    private readonly updateMappingUseCase: UpdateDataSourceMapping,
    private readonly deleteMappingUseCase: DeleteDataSourceMapping,
    private readonly getMappingUseCase: GetDataSourceMapping,
    private readonly listMappingsUseCase: ListDataSourceMappings
  ) {}

  async listMappings(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { operationId } = req.query;
      
      const mappings = await this.listMappingsUseCase.execute({
        projectId,
        operationId: operationId as string | undefined,
      });
      
      res.status(200).json({ success: true, data: mappings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createMapping(req: Request, res: Response): Promise<void> {
    try {
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

      res.status(201).json({ success: true, data: mapping });
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getMapping(req: Request, res: Response): Promise<void> {
    try {
      const { mappingId } = req.params;
      const mapping = await this.getMappingUseCase.execute(mappingId);
      res.status(200).json({ success: true, data: mapping });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateMapping(req: Request, res: Response): Promise<void> {
    try {
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

      res.status(200).json({ success: true, data: mapping });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async deleteMapping(req: Request, res: Response): Promise<void> {
    try {
      const { mappingId } = req.params;
      await this.deleteMappingUseCase.execute(mappingId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default DataSourceMappingController;