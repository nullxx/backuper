
import { Router, Request, Response, NextFunction } from 'express';
import Logger from '../../lib/logger';
import { ConfigType, readConfig, writeConfig } from '../../lib/fsconfig';
import * as db from '../../lib/database';
import { startJobs } from '../../jobs';
import { requireAuthSoft } from '../middlewares/auth';
import { APIError } from '../error/APIError';

const router = Router();

const logger = Logger();

router.get(
    "/connect-database",
    requireAuthSoft,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dbConfig = await readConfig(ConfigType.DB);
            res.render('connect-database', { layout: Object.keys(dbConfig).length === 0 ? 'empty' : 'index', dbConfig })
        } catch (error) {
            next(error);
        }
    },
);

router.post(
    "/connect-database",
    requireAuthSoft,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                host,
                username,
                password,
                database,
                port,
            } = req.body;

            logger.info('Database connected', {
                host,
                username,
                password,
                database,
                port,
            });

            await writeConfig(ConfigType.DB, {
                host,
                username,
                password,
                database,
                port,
            });

            if (!db.isInitialized()) {
                await db.initialize();
                await startJobs();
            } else {
                throw new APIError('Config saved but database already initialized. Please restart the server to apply changes.', true);
            }

            res.redirect('/');
        } catch (error) {
            next(error);
        }
    },
);

export default router;