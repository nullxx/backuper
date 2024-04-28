import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        next();
    } else if (req.path !== '/login' && req.path !== '/register') {
        res.redirect('/login');
    } else {
        next();
    }
}

export function requireAuthSoft(req: Request, res: Response, next: NextFunction) {
    // only require auth if database is set
    if (req.app.locals.dbExists && req.app.locals.testDbOk) {
        requireAuth(req, res, next);
    } else {
        next();
    }
}