// ApiController - Controller for API Management endpoints
import { Request, Response } from 'express';
import { CreateApiService } from '../../application/api/CreateApiService';
import { UpdateApiService } from '../../application/api/UpdateApiService';
import { DeleteApiService } from '../../application/api/DeleteApiService';
import { GetApiService } from '../../application/api/GetApiService';
import { ListApiServices } from '../../application/api/ListApiServices';
import { CreateApiOperation } from '../../application/api/CreateApiOperation';
import { UpdateApiOperation } from '../../application/api/UpdateApiOperation';
import { DeleteApiOperation } from '../../application/api/DeleteApiOperation';
import { GetApiOperation } from '../../application/api/GetApiOperation';
import { ListApiOperations } from '../../application/api/ListApiOperations';
import { ImportApiContract, ImportSummary } from '../../application/api/ImportApiContract';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';

export class ApiController {
  constructor(
    private readonly createApiService: CreateApiService,
    private readonly updateApiService: UpdateApiService,
    private readonly deleteApiService: DeleteApiService,
    private readonly getApiService: GetApiService,
    private readonly listApiServices: ListApiServices,
    private readonly createApiOperation: CreateApiOperation,
    private readonly updateApiOperation: UpdateApiOperation,
    private readonly deleteApiOperation: DeleteApiOperation,
    private readonly getApiOperation: GetApiOperation,
    private readonly listApiOperations: ListApiOperations,
    private readonly importApiContract: ImportApiContract,
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository
  ) {}

  async listServices(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const services = await this.listApiServices.execute(projectId);
      res.status(200).json({ success: true, data: services });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createService(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { name, description, version, tags } = req.body;

      const service = await this.createApiService.execute({
        projectId,
        name,
        description,
        version,
        tags,
      });

      res.status(201).json({ success: true, data: service });
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

  async getService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const service = await this.getApiService.execute(serviceId);
      res.status(200).json({ success: true, data: service });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { name, description, version, tags } = req.body;

      const service = await this.updateApiService.execute({
        id: serviceId,
        name,
        description,
        version,
        tags,
      });

      res.status(200).json({ success: true, data: service });
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

  async deleteService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      await this.deleteApiService.execute(serviceId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async listOperations(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const operations = await this.listApiOperations.execute(serviceId);
      res.status(200).json({ success: true, data: operations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createOperation(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, serviceId } = req.params;
      const { name, method, path, description, authenticationType, status } = req.body;

      const operation = await this.createApiOperation.execute({
        projectId,
        serviceId,
        name,
        method,
        path,
        description,
        authenticationType,
        status,
      });

      res.status(201).json({ success: true, data: operation });
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty') || error.message.includes('must begin with')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getOperation(req: Request, res: Response): Promise<void> {
    try {
      const { apiId } = req.params;
      const operation = await this.getApiOperation.execute(apiId);
      res.status(200).json({ success: true, data: operation });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateOperation(req: Request, res: Response): Promise<void> {
    try {
      const { apiId } = req.params;
      const { name, method, path, description, authenticationType, status } = req.body;

      const operation = await this.updateApiOperation.execute({
        id: apiId,
        name,
        method,
        path,
        description,
        authenticationType,
        status,
      });

      res.status(200).json({ success: true, data: operation });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('required') || error.message.includes('cannot be empty') || error.message.includes('must begin with')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async deleteOperation(req: Request, res: Response): Promise<void> {
    try {
      const { apiId } = req.params;
      await this.deleteApiOperation.execute(apiId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async importContract(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded', details: null });
        return;
      }

      const content = file.buffer.toString('utf-8');
      const fileName = file.originalname;

      const summary: ImportSummary = await this.importApiContract.execute({
        projectId,
        fileName,
        content,
      });

      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default ApiController;
