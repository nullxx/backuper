import { Router } from 'express';

import connectDatabaseRouter from './connect-database';
import authenticationRouter from './authentication.rouco';
import backupsRouter from './backups.rouco';
import bucketRouter from './bucket.rouco';
import dbscheduleRouter from './dbschedule.rouco';
import dbNotSetMiddleware from '../middlewares/db-not-set';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(dbNotSetMiddleware);

router.use(connectDatabaseRouter);
router.use(authenticationRouter);

// all routes below this line require authentication
router.use(requireAuth);
router.use(backupsRouter);
router.use(bucketRouter);
router.use(dbscheduleRouter);

export default router;