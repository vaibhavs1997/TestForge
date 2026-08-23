import { Request, Response } from 'express';
import { isJiraConfigured } from '../../config/jiraEnv.js';
import { createSuccessResponse } from '../../shared/ApiResponse.js';

export class IntegrationsController {
  async getJiraStatus(_req: Request, res: Response): Promise<void> {
    res.status(200).json(
      createSuccessResponse({
        configured: isJiraConfigured(),
      }),
    );
  }
}

export default IntegrationsController;
