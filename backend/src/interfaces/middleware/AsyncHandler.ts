// AsyncHandler - Wrapper for async route handlers to properly handle errors
import { Request, Response, NextFunction } from 'express';

let resourceAuthorizer: ((req: Request) => Promise<void>) | undefined;
export function setProjectResourceAuthorizer(authorizer: (req: Request) => Promise<void>): void {
  resourceAuthorizer = authorizer;
}

/**
 * Wraps async route handlers to catch any thrown errors and pass them to Express error handling middleware
 * Usage: router.get('/path', asyncHandler(controller.method.bind(controller)))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve().then(async () => {
      if (resourceAuthorizer) await resourceAuthorizer(req);
      return fn(req, res, next);
    }).catch(next);
  };
}
