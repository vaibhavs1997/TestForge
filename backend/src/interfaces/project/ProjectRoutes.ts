import { Router } from 'express';
import { container } from '../../application/ApplicationContainer.js';

export const projectRoutes: Router = container.projectModule.router;

export default projectRoutes;
