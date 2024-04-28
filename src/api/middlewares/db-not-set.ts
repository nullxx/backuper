import {Request, Response, NextFunction} from 'express';
import { ConfigType, configExists } from '../../lib/fsconfig';
import * as db from '../../lib/database';

export default async function dbNotSetMiddleware(req: Request, res: Response, next: NextFunction) {
    if (typeof req.app.locals.dbExists === 'undefined' || req.app.locals.dbExists === false) {
        const exists = configExists(ConfigType.DB);
        req.app.locals.dbExists = exists;
    }

    if (req.app.locals.dbExists) req.app.locals.testDbOk = await db.test();

    if (!req.app.locals.dbExists || !req.app.locals.testDbOk) {
        if (req.path !== '/connect-database') return res.redirect("/connect-database");
    }
    next();
}