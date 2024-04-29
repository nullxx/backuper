
import { Router, Request, Response, NextFunction } from 'express';
import Logger from '../../lib/logger';
import { ConfigType, readConfig, writeConfig } from '../../lib/fsconfig';
import { requireAuthSoft } from '../middlewares/auth';
import { launch, unlaunch } from '../../launch';

const router = Router();

const logger = Logger();

router.get(
    "/connect-database",
    requireAuthSoft,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dbConfig = await readConfig(ConfigType.DB);
            res.render('connect-database', { layout: Object.keys(dbConfig ?? {}).length === 0 ? 'empty' : 'index', dbConfig })
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

            await unlaunch();
            await launch();

            res.redirect('/');
        } catch (error) {
            next(error);
        }
    },
);

export default router;