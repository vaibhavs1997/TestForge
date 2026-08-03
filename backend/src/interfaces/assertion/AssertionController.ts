// AssertionController - Controller for Assertion Library endpoints

import { Request, Response } from 'express';
import { ManageAssertions } from '../../application/assertion/ManageAssertions';

export class AssertionController {
  constructor(private readonly manageAssertions: ManageAssertions) {}

  async createAssertion(req: Request, res: Response): Promise<void> {
    try {
      const assertion = await this.manageAssertions.createAssertion(req.body);
      res.status(201).json({ success: true, data: assertion });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to create assertion', details: null });
    }
  }

  async updateAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assertion = await this.manageAssertions.updateAssertion(id, req.body);
      res.status(200).json({ success: true, data: assertion });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to update assertion', details: null });
    }
  }

  async deleteAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.manageAssertions.deleteAssertion(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to delete assertion', details: null });
    }
  }

  async getAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assertion = await this.manageAssertions.getAssertion(id);
      
      if (!assertion) {
        res.status(404).json({ success: false, message: 'Assertion not found', details: null });
        return;
      }
      
      res.status(200).json({ success: true, data: assertion });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async listAssertions(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const assertions = await this.manageAssertions.listAssertions(projectId);
      res.status(200).json({ success: true, data: assertions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async searchAssertions(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({ success: false, message: 'Query parameter "q" is required', details: null });
        return;
      }
      
      const assertions = await this.manageAssertions.searchAssertions(projectId, q);
      res.status(200).json({ success: true, data: assertions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async toggleAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      const assertion = await this.manageAssertions.toggleAssertion(id, enabled);
      res.status(200).json({ success: true, data: assertion });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to toggle assertion', details: null });
    }
  }

  async duplicateAssertion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assertion = await this.manageAssertions.duplicateAssertion(id);
      res.status(201).json({ success: true, data: assertion });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to duplicate assertion', details: null });
    }
  }
}

export default AssertionController;