import { Router } from 'express';
import { container } from '../../application/ApplicationContainer.js';

export const environmentRoutes: Router = container.environmentModule.router;

export default environmentRoutes;
