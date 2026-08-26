// ApiController - Controller for API Management endpoints
import { Request, Response } from 'express';
import { CreateApiService } from '../../application/api/CreateApiService.js';
import { UpdateApiService } from '../../application/api/UpdateApiService.js';
import { DeleteApiService } from '../../application/api/DeleteApiService.js';
import { GetApiService } from '../../application/api/GetApiService.js';
import { ListApiServices } from '../../application/api/ListApiServices.js';
import { CreateApiOperation } from '../../application/api/CreateApiOperation.js';
import { UpdateApiOperation } from '../../application/api/UpdateApiOperation.js';
import { DeleteApiOperation } from '../../application/api/DeleteApiOperation.js';
import { DeleteApiContract } from '../../application/api/DeleteApiContract.js';
import { GetApiOperation } from '../../application/api/GetApiOperation.js';
import { ListApiOperations } from '../../application/api/ListApiOperations.js';
import { ExecuteApiRequest } from '../../application/api/ExecuteApiRequest.js';
import { ImportApiContract, ImportSummary } from '../../application/api/ImportApiContract.js';
import { RefreshApiContract, RefreshApiContractResult } from '../../application/api/RefreshApiContract.js';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
import { fetchContractFromUrl } from '../../infrastructure/http/fetchContractFromUrl.js';
import { serializeApiOperation, serializeApiService } from './ApiDtos.js';
import { NotFoundError } from '../../shared/errors.js';
export class ApiController {
    constructor(private readonly createApiService: CreateApiService, private readonly updateApiService: UpdateApiService, private readonly deleteApiService: DeleteApiService, private readonly getApiService: GetApiService, private readonly listApiServices: ListApiServices, private readonly createApiOperation: CreateApiOperation, private readonly updateApiOperation: UpdateApiOperation, private readonly deleteApiOperation: DeleteApiOperation, private readonly getApiOperation: GetApiOperation, private readonly listApiOperations: ListApiOperations, private readonly importApiContract: ImportApiContract, private readonly refreshApiContract: RefreshApiContract, private readonly deleteApiContract: DeleteApiContract, private readonly executeApiRequest: ExecuteApiRequest, private readonly apiServiceRepository: ApiServiceRepository, private readonly apiOperationRepository: ApiOperationRepository) { }
    private async requireServiceInProject(projectId: string, serviceId: string) {
        const service = await this.apiServiceRepository.findById(serviceId);
        if (!service || service.projectId !== projectId) {
            throw new NotFoundError(`Service with id ${serviceId} not found in this project`);
        }
        return service;
    }
    private async requireOperationInProject(projectId: string, serviceId: string, apiId: string) {
        const operation = await this.apiOperationRepository.findById(apiId);
        if (!operation || operation.projectId !== projectId || operation.serviceId !== serviceId) {
            throw new NotFoundError(`API with id ${apiId} not found in this project`);
        }
        return operation;
    }
    async listServices(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const services = await this.listApiServices.execute(projectId);
        res.status(200).json(createSuccessResponse(services.map(serializeApiService)));
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
        const { projectId, serviceId } = req.params;
        await this.requireServiceInProject(projectId, serviceId);
        const service = await this.getApiService.execute(serviceId);
        res.status(200).json(createSuccessResponse(serializeApiService(service)));
    }
    async updateService(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId } = req.params;
        await this.requireServiceInProject(projectId, serviceId);
        const { name, description, version, tags, baseUrl } = req.body;
        const service = await this.updateApiService.execute({
            id: serviceId,
            name,
            description,
            version,
            tags,
            baseUrl,
        });
        res.status(200).json(createSuccessResponse(serializeApiService(service)));
    }
    async deleteService(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId } = req.params;
        await this.deleteApiService.execute(projectId, serviceId);
        res.status(204).send();
    }
    async listOperations(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId } = req.params;
        const operations = await this.listApiOperations.execute(projectId, serviceId);
        res.status(200).json(createSuccessResponse(operations.map(serializeApiOperation)));
    }
    async createOperation(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId } = req.params;
        await this.requireServiceInProject(projectId, serviceId);
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
        res.status(201).json(createSuccessResponse(serializeApiOperation(operation)));
    }
    async getOperation(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId, apiId } = req.params;
        await this.requireOperationInProject(projectId, serviceId, apiId);
        const operation = await this.getApiOperation.execute(apiId);
        res.status(200).json(createSuccessResponse(serializeApiOperation(operation)));
    }
    async updateOperation(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId, apiId } = req.params;
        await this.requireOperationInProject(projectId, serviceId, apiId);
        const { name, method, path, description, authenticationType, status, sampleRequestBody, requestUrl, sourceOperation } = req.body;
        const operation = await this.updateApiOperation.execute({
            id: apiId,
            name,
            method,
            path,
            description,
            authenticationType,
            status,
            sampleRequestBody,
            requestUrl,
            sourceOperation,
        });
        res.status(200).json(createSuccessResponse(serializeApiOperation(operation)));
    }
    async deleteOperation(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId, apiId } = req.params;
        await this.requireOperationInProject(projectId, serviceId, apiId);
        await this.deleteApiOperation.execute(apiId);
        res.status(204).send();
    }
    async deleteContract(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const result = await this.deleteApiContract.execute(projectId);
        res.status(200).json(createSuccessResponse(result));
    }
    async refreshContract(req: Request, res: Response): Promise<void> {
        const { projectId, serviceId } = req.params;
        const result: RefreshApiContractResult = await this.refreshApiContract.execute(projectId, serviceId);
        res.status(200).json(createSuccessResponse(result));
    }
    async executeOperation(req: Request, res: Response): Promise<void> {
        const { requestUrl, method, headers, body, timeoutMs, useTestData, operationId, serviceId } = req.body ?? {};
        const projectId = req.params?.projectId;
        const result = await this.executeApiRequest.execute({
            requestUrl,
            method,
            headers,
            body,
            timeoutMs,
            ...(projectId ? { projectId } : {}),
            ...(useTestData ? { useTestData: true } : {}),
            ...(operationId ? { operationId } : {}),
            ...(serviceId ? { serviceId } : {}),
        });
        res.status(200).json(createSuccessResponse(result));
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
    async previewImportContract(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const file = req.file;
        if (!file) throw new Error('No file uploaded');
        const summary = await this.importApiContract.execute({ projectId, fileName: file.originalname, content: file.buffer.toString('utf-8'), preview: true });
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
    async previewImportContractFromUrl(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
        if (!url) throw new Error('URL is required');
        const { content, fileName } = await fetchContractFromUrl(url);
        const summary = await this.importApiContract.execute({ projectId, fileName, content, preview: true });
        res.status(200).json(createSuccessResponse(summary));
    }
}
export default ApiController;

