import { Router } from 'express';
import { asyncHandler } from '../middleware/AsyncHandler';
import { container } from '../../application/ApplicationContainer';

export const projectRoutes: Router = container.projectModule.router;

export default projectRoutes;
