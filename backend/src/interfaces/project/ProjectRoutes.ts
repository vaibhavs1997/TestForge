import { Router } from 'express';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { container } from '../../application/ApplicationContainer.js';

export const projectRoutes: Router = container.projectModule.router;

export default projectRoutes;
