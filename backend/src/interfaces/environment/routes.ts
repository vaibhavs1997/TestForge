import { Router } from 'express';
import { container } from '../../application/ApplicationContainer';

export const environmentRoutes: Router = container.environmentModule.router;

export default environmentRoutes;
