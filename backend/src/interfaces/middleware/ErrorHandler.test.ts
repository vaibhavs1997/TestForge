import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from './ErrorHandler.js';

describe('errorHandler', () => {
  it('maps unknown errors to internal server error', () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const res = { status, json } as any;
    const req = { path: '/api/test', method: 'GET' } as any;

    errorHandler(new Error('something unexpected happened'), req, res, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'INTERNAL_SERVER_ERROR',
      }),
    );
  });
});
