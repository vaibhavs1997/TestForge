// AssertionController - Controller for Assertion Library endpoints

import { Request, Response } from 'express';
import { ManageAssertions } from '../../application/assertion/ManageAssertions';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class AssertionController {
  constructor(private readonly manageAssertions: ManageAssertions) {}

  async createAssertion(req: Request, res: Response): Promise<void> {
    try {
      const assertion = await this.manageAssertions.createAssertion(req.body);
      res.status(201).json(createSuccessResponse(assertion));
    } catch (error: any) {
      res.status(400).json(createErrorResponse(error.message || 'Failed to create assertion', 'VALIDATION_ERROR'));
    }
  }

  async updateAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assertion = await this.manageAssertions.updateAssertion(id, req.body);
      res.status(200).json(createSuccessResponse(assertion));
    } catch (error: any) {
      res.status(400).json(createErrorResponse(error.message || 'Failed to update assertion', 'VALIDATION_ERROR'));
    }
  }

  async deleteAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.manageAssertions.deleteAssertion(id);
      res.status(200).json(createSuccessResponse(null));
    } catch (error: any) {
      res.status(400).json(createErrorResponse(error.message || 'Failed to delete assertion', 'VALIDATION_ERROR'));
    }
  }

  async getAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assertion = await this.manageAssertions.getAssertion(id);
      
      if (!assertion) {
        res.status(404).json(createErrorResponse('Assertion not found', 'NOT_FOUND'));
        return;
      }
      
      res.status(200).json(createSuccessResponse(assertion));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async listAssertions(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const assertions = await this.manageAssertions.listAssertions(projectId);
      res.status(200).json(createSuccessResponse(assertions));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async searchAssertions(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json(createErrorResponse('Query parameter "q" is required', 'VALIDATION_ERROR'));
        return;
      }
      
      const assertions = await this.manageAssertions.searchAssertions(projectId, q);
      res.status(200).json(createSuccessResponse(assertions));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async toggleAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      const assertion = await this.manageAssertions.toggleAssertion(id, enabled);
      res.status(200).json(createSuccessResponse(assertion));
    } catch (error: any) {
      res.status(400).json(createErrorResponse(error.message || 'Failed to toggle assertion', 'VALIDATION_ERROR'));
    }
  }

  async duplicateAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assertion = await this.manageAssertions.duplicateAssertion(id);
      res.status(201).json(createSuccessResponse(assertion));
    } catch (error: any) {
      res.status(400).json(createErrorResponse(error.message || 'Failed to duplicate assertion', 'VALIDATION_ERROR'));
    }
  }
}

export default AssertionController;