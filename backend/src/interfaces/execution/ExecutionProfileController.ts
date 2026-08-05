// ExecutionProfileController - REST Controller for Execution Profiles

import { Request, Response } from 'express';
import { ManageExecutionProfiles } from '../../application/execution/ManageExecutionProfiles';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class ExecutionProfileController {
  constructor(private readonly manageProfiles: ManageExecutionProfiles) {}

  async listByProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const profiles = await this.manageProfiles.listByProject(projectId);
      
      res.status(200).json(createSuccessResponse(profiles));
    } catch (error: any) {
      console.error('List profiles error:', error);
      res.status(500).json(createErrorResponse(error.message || 'Failed to list profiles', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getDefault(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const profile = await this.manageProfiles.getDefault(projectId);
      
      res.status(200).json(createSuccessResponse(profile));
    } catch (error: any) {
      console.error('Get default profile error:', error);
      res.status(500).json(createErrorResponse(error.message || 'Failed to get default profile', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const profile = await this.manageProfiles.getById(profileId);
      
      if (!profile) {
        res.status(404).json(createErrorResponse('Profile not found', 'NOT_FOUND'));
        return;
      }

      res.status(200).json(createSuccessResponse(profile));
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json(createErrorResponse(error.message || 'Failed to get profile', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const body = req.body;

      const profile = await this.manageProfiles.create({
        ...body,
        projectId,
      });

      res.status(201).json(createSuccessResponse(profile));
    } catch (error: any) {
      console.error('Create profile error:', error);
      res.status(400).json(createErrorResponse(error.message || 'Failed to create profile', 'VALIDATION_ERROR'));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const body = req.body;

      const profile = await this.manageProfiles.update(profileId, body);

      res.status(200).json(createSuccessResponse(profile));
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(400).json(createErrorResponse(error.message || 'Failed to update profile', 'VALIDATION_ERROR'));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      await this.manageProfiles.delete(profileId);

      res.status(200).json({
        success: true,
        message: 'Profile deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete profile error:', error);
      res.status(400).json(createErrorResponse(error.message || 'Failed to delete profile', 'VALIDATION_ERROR'));
    }
  }

  async duplicate(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const { name } = req.body;

      if (!name) {
        res.status(400).json(createErrorResponse('New profile name is required', 'VALIDATION_ERROR'));
        return;
      }

      const profile = await this.manageProfiles.duplicate(profileId, name);

      res.status(201).json(createSuccessResponse(profile));
    } catch (error: any) {
      console.error('Duplicate profile error:', error);
      res.status(400).json(createErrorResponse(error.message || 'Failed to duplicate profile', 'VALIDATION_ERROR'));
    }
  }
}

export default ExecutionProfileController;