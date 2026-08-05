// VersionController - Controller for Versioning Module endpoints
import { Request, Response } from 'express';
import { VersionService } from '../../application/versioning/VersionService';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class VersionController {
    constructor(private readonly versionService: VersionService) { }
    async listVersions(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { entityType, entityId } = req.query;
        let versions;
        if (entityType && entityId) {
            versions = await this.versionService.listEntityVersions(entityType as string, entityId as string);
        }
        else {
            versions = await this.versionService.listProjectVersions(projectId);
        }
        res.status(200).json(createSuccessResponse(versions));
    }
    async getVersion(req: Request, res: Response): Promise<void> {
        const { versionId } = req.params;
        const version = await this.versionService.getVersion(versionId);
        res.status(200).json(createSuccessResponse(version));
    }
    async getEntityVersions(req: Request, res: Response): Promise<void> {
        const { projectId, entityType, entityId } = req.params;
        const versions = await this.versionService.listEntityVersions(entityType, entityId);
        res.status(200).json(createSuccessResponse(versions));
    }
    async restoreVersion(req: Request, res: Response): Promise<void> {
        const { versionId } = req.params;
        const restored = await this.versionService.restoreVersion({ versionId });
        res.status(200).json(createSuccessResponse(restored));
    }
    async compareVersions(req: Request, res: Response): Promise<void> {
        const { versionId1, versionId2 } = req.params;
        const comparison = await this.versionService.compareVersions(versionId1, versionId2);
        res.status(200).json(createSuccessResponse(comparison));
    }
}
export default VersionController;

