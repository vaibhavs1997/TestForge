// VersionController - Controller for Versioning Module endpoints
import { Request, Response } from 'express';
import { VersionService } from '../../application/versioning/VersionService';
import { createSuccessResponse } from "../../shared/ApiResponse";
import { assertProjectAccess } from '../middleware/auth';
export class VersionController {
    constructor(private readonly versionService: VersionService) { }
    async listVersions(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { entityType, entityId } = req.query;
        let versions;
        if (entityType && entityId) {
            const candidates = await this.versionService.listEntityVersions(entityType as string, entityId as string);
            versions = [];
            for (const version of candidates) {
                try { await assertProjectAccess(version.projectId, req.auth); versions.push(version); } catch { /* hide out-of-scope versions */ }
            }
        }
        else {
            await assertProjectAccess(projectId, req.auth);
            versions = await this.versionService.listProjectVersions(projectId);
        }
        res.status(200).json(createSuccessResponse(versions));
    }
    async getVersion(req: Request, res: Response): Promise<void> {
        const { versionId } = req.params;
        const version = await this.versionService.getVersion(versionId);
        await assertProjectAccess(version.projectId, req.auth);
        res.status(200).json(createSuccessResponse(version));
    }
    async getEntityVersions(req: Request, res: Response): Promise<void> {
        const { projectId, entityType, entityId } = req.params;
        await assertProjectAccess(projectId, req.auth);
        const versions = await this.versionService.listEntityVersions(entityType, entityId);
        res.status(200).json(createSuccessResponse(versions));
    }
    async restoreVersion(req: Request, res: Response): Promise<void> {
        const { versionId } = req.params;
        const source = await this.versionService.getVersion(versionId);
        await assertProjectAccess(source.projectId, req.auth);
        const restored = await this.versionService.restoreVersion({ versionId });
        res.status(200).json(createSuccessResponse(restored));
    }
    async compareVersions(req: Request, res: Response): Promise<void> {
        const { versionId1, versionId2 } = req.params;
        const oldVersion = await this.versionService.getVersion(versionId1);
        const newVersion = await this.versionService.getVersion(versionId2);
        await assertProjectAccess(oldVersion.projectId, req.auth);
        await assertProjectAccess(newVersion.projectId, req.auth);
        if (oldVersion.projectId !== newVersion.projectId) throw new Error('Cannot compare versions from different projects');
        const comparison = await this.versionService.compareVersions(versionId1, versionId2);
        res.status(200).json(createSuccessResponse(comparison));
    }
}
export default VersionController;

