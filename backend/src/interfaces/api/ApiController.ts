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
import { createSuccessResponse } from "../../shared/ApiResponse";
import { fetchContractFromUrl } from '../../infrastructure/http/fetchContractFromUrl';
export class ApiController {
    constructor(private readonly createApiService: CreateApiService, private readonly updateApiService: UpdateApiService, private readonly deleteApiService: DeleteApiService, private readonly getApiService: GetApiService, private readonly listApiServices: ListApiServices, private readonly createApiOperation: CreateApiOperation, private readonly updateApiOperation: UpdateApiOperation, private readonly deleteApiOperation: DeleteApiOperation, private readonly getApiOperation: GetApiOperation, private readonly listApiOperations: ListApiOperations, private readonly importApiContract: ImportApiContract, private readonly apiServiceRepository: ApiServiceRepository, private readonly apiOperationRepository: ApiOperationRepository) { }
    async listServices(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const services = await this.listApiServices.execute(projectId);
        res.status(200).json(createSuccessResponse(services));
    }
    async createService(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { name, description, version, tags, baseUrl } = req.body;
        const service = await this.createApiService.execute({
            projectId,
            name,
            description,
            version,
            tags,
            baseUrl,
        });
        res.status(201).json(createSuccessResponse(service));
    }
    async getService(req: Request, res: Response): Promise<void> {
        const { serviceId } = req.params;
        const service = await this.getApiService.execute(serviceId);
        res.status(200).json(createSuccessResponse(service));
    }
    async updateService(req: Request, res: Response): Promise<void> {
        const { serviceId } = req.params;
        const { name, description, version, tags, baseUrl } = req.body;
        const service = await this.updateApiService.execute({
            id: serviceId,
            name,
            description,
            version,
            tags,
            baseUrl,
        });
        res.status(200).json(createSuccessResponse(service));
    }
    async deleteService(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId } = req.params;
        await this.deleteApiService.execute(projectId, serviceId);
        res.status(204).send();
    }
    async listOperations(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId } = req.params;
        const operations = await this.listApiOperations.execute(projectId, serviceId);
        res.status(200).json(createSuccessResponse(operations));
    }
    async createOperation(req: Request, res: Response): Promise<void> {
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
        res.status(201).json(createSuccessResponse(operation));
    }
    async getOperation(req: Request, res: Response): Promise<void> {
        const { apiId } = req.params;
        const operation = await this.getApiOperation.execute(apiId);
        res.status(200).json(createSuccessResponse(operation));
    }
    async updateOperation(req: Request, res: Response): Promise<void> {
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
        res.status(200).json(createSuccessResponse(operation));
    }
    async deleteOperation(req: Request, res: Response): Promise<void> {
        const { apiId } = req.params;
        await this.deleteApiOperation.execute(apiId);
        res.status(204).send();
    }
    async importContract(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const file = req.file;
        if (!file) {
            throw new Error('No file uploaded');
        }
        const content = file.buffer.toString('utf-8');
        const fileName = file.originalname;
        const summary: ImportSummary = await this.importApiContract.execute({
            projectId,
            fileName,
            content,
        });
        res.status(200).json(createSuccessResponse(summary));
    }
    async importContractFromUrl(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
        if (!url) {
            throw new Error('URL is required');
        }
        const { content, fileName } = await fetchContractFromUrl(url);
        const summary: ImportSummary = await this.importApiContract.execute({
            projectId,
            fileName,
            content,
        });
        res.status(200).json(createSuccessResponse(summary));
    }
}
export default ApiController;

