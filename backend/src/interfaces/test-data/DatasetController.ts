// DatasetController - Controller for Test Data Library endpoints
import { Request, Response } from 'express';
import { CreateDataset } from '../../application/test-data/CreateDataset';
import { UpdateDataset } from '../../application/test-data/UpdateDataset';
import { DeleteDataset } from '../../application/test-data/DeleteDataset';
import { GetDataset } from '../../application/test-data/GetDataset';
import { ListDatasets } from '../../application/test-data/ListDatasets';

export class DatasetController {
  constructor(
    private readonly createDatasetUseCase: CreateDataset,
    private readonly updateDatasetUseCase: UpdateDataset,
    private readonly deleteDatasetUseCase: DeleteDataset,
    private readonly getDatasetUseCase: GetDataset,
    private readonly listDatasetsUseCase: ListDatasets
  ) {}

  async listDatasets(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const datasets = await this.listDatasetsUseCase.execute({ projectId });
      res.status(200).json({ success: true, data: datasets });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createDataset(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { name, description, category } = req.body;

      const dataset = await this.createDatasetUseCase.execute({
        projectId,
        name,
        description,
        category,
      });

      res.status(201).json({ success: true, data: dataset });
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

  async getDataset(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const dataset = await this.getDatasetUseCase.execute(datasetId);
      res.status(200).json({ success: true, data: dataset });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateDataset(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const { name, description, category } = req.body;

      const dataset = await this.updateDatasetUseCase.execute({
        id: datasetId,
        name,
        description,
        category,
      });

      res.status(200).json({ success: true, data: dataset });
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

  async deleteDataset(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      await this.deleteDatasetUseCase.execute(datasetId);
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

export default DatasetController;