import { Router } from 'express';
import { asyncHandler } from '../middleware/AsyncHandler';
import { createSuccessResponse } from '../../shared/ApiResponse';
import { getAuthConfig, getEnterpriseAuthConfig } from '../../config';
import type { AuthService } from '../../application/auth/AuthService';
import { AppError } from '../middleware/ErrorHandler';
import { ERROR_CODES } from '../../shared/ApiResponse';

export function createAuthRoutes(authService: AuthService): Router {
  const router = Router();

  router.get('/auth/config', (_req, res) => {
    const enterprise = getEnterpriseAuthConfig();
    const auth = getAuthConfig();
    res.status(200).json(
      createSuccessResponse({
        loginRequired: enterprise.requireLogin,
        registerAllowed: enterprise.requireLogin,
        authEnabled: auth.enabled,
      }),
    );
  });

  router.post(
    '/auth/register',
    asyncHandler(async (req, res) => {
      if (!getEnterpriseAuthConfig().requireLogin) {
        throw new AppError(403, 'Registration is disabled', ERROR_CODES.FORBIDDEN);
      }
      const { email, password, displayName, organizationName, firstName, lastName } = req.body ?? {};
      try {
        const result = await authService.register({
          email: String(email ?? ''),
          password: String(password ?? ''),
          displayName: displayName ? String(displayName) : undefined,
          organizationName: organizationName ? String(organizationName) : '',
          firstName: firstName ? String(firstName) : '',
          lastName: lastName ? String(lastName) : '',
        });
        res.status(201).json(createSuccessResponse(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        if (message.includes('already exists')) {
          throw new AppError(409, message, ERROR_CODES.CONFLICT);
        }
        throw new AppError(400, message, ERROR_CODES.VALIDATION_ERROR);
      }
    }),
  );

  router.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
      if (!getEnterpriseAuthConfig().requireLogin) {
        throw new AppError(403, 'Login is disabled', ERROR_CODES.FORBIDDEN);
      }
      const { email, password } = req.body ?? {};
      try {
        const result = await authService.login(String(email ?? ''), String(password ?? ''));
        res.status(200).json(createSuccessResponse(result));
      } catch (err) {
        throw new AppError(
          401,
          err instanceof Error ? err.message : 'Invalid credentials',
          ERROR_CODES.UNAUTHORIZED,
        );
      }
    }),
  );

  return router;
}

export default createAuthRoutes;
