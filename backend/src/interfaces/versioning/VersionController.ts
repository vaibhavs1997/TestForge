// VersionController - Controller for Versioning Module endpoints
import { Request, Response } from 'express';
import { VersionService } from '../../application/versioning/VersionService';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { entityType, entityId } = req.query;
      
      let versions;
      if (entityType && entityId) {
        versions = await this.versionService.listEntityVersions(entityType as string, entityId as string);
      } else {
        versions = await this.versionService.listProjectVersions(projectId);
      }
      
      res.status(200).json(createSuccessResponse(versions));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getVersion(req: Request, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      const version = await this.versionService.getVersion(versionId);
      res.status(200).json(createSuccessResponse(version));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getEntityVersions(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, entityType, entityId } = req.params;
      const versions = await this.versionService.listEntityVersions(entityType, entityId);
      res.status(200).json(createSuccessResponse(versions));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async restoreVersion(req: Request, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      const restored = await this.versionService.restoreVersion({ versionId });
      res.status(200).json(createSuccessResponse(restored, 'Version restored successfully'));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async compareVersions(req: Request, res: Response): Promise<void> {
    try {
      const { versionId1, versionId2 } = req.params;
      const comparison = await this.versionService.compareVersions(versionId1, versionId2);
      res.status(200).json(createSuccessResponse(comparison));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default VersionController;