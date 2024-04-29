import { Request, Response, NextFunction } from 'express';
import { ConfigType, readConfig } from '../../lib/fsconfig';
import { APIError } from '../error/APIError';
import Logger from '../../lib/logger';

const logger = Logger();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        next();
    } else if (req.path !== '/login' && req.path !== '/register') {
        res.redirect('/login');
    } else {
        next();
    }
}

export async function requireAuthSoft(req: Request, res: Response, next: NextFunction) {
    // only require auth if database is set
    if (req.app.locals.dbExists && req.app.locals.testDbOk) {
        requireAuth(req, res, next);
    } else if ((await readConfig(ConfigType.DB_INITIALIZED))?.initialized){
        next(new APIError(`Database is configured but connection test failed. Please check the logs`, true));
        logger.error(`Database is configured but connection test failed: please check database is up and running, or reconfigure the database connection at ${ConfigType.DB}`);
    } else {
        next();
    }
}