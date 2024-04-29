import { rateLimit } from 'express-rate-limit';
import { NextFunction, Request, Response } from 'express';

import { APIError } from '../error/APIError';

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    handler: (_req: Request, _res: Response, next: NextFunction) => {
        return next(new APIError("Too many requests", true));
    },
});

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    return rateLimiter(req, res, next);
}