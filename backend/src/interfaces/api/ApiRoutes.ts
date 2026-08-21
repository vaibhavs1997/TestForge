import { Router } from 'express';
import { container } from '../../application/ApplicationContainer.js';

export const apiRoutes: Router = container.apiModule.router;

export default apiRoutes;
