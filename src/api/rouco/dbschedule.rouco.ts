import { Router, Request, Response, NextFunction } from 'express';
import { Bucket } from '../../schemas/bucket.schema';
import Logger from '../../lib/logger';
import { DBSchedule } from '../../schemas/dbschedule.schema';
import { Backup } from '../../schemas/backup.schema';
import { deleteBackup, nextDateBackup } from '../../lib/backup';
import { APIError } from '../error/APIError';

const router = Router();

const logger = Logger();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSchedules = await DBSchedule.findAll();
  res.render("main", {
    layout: "index",
    dbSchedules: await Promise.all(dbSchedules.map(async (dbSchedule) => {
      return {
        nextDate: await nextDateBackup(dbSchedule),
        ...dbSchedule.formatV1()
      }
    })),
  });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/new-dbschedule",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const buckets = await Bucket.findAll();
      res.render("dbschedule", { layout: "index", buckets });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/new-dbschedule",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        dbUri,
        dbType,
        backupIntervalSeconds,
        backupRetentionSeconds,
        bucketId,
        bucketPath,
      } = req.body;

      logger.info("New dbschedule created", {
        name,
        dbUri,
        dbType,
        backupIntervalSeconds,
        backupRetentionSeconds,
        bucketId,
        bucketPath,
      });

      const bucket = await Bucket.findByPk(bucketId);
      if (!bucket) throw new APIError("Bucket not found", true);

      const dbSchedule = DBSchedule.build({
        name,
        dbURI: dbUri,
        dbType,
        backupIntervalSeconds: Number(backupIntervalSeconds),
        backupRetentionSeconds: Number(backupRetentionSeconds),
        bucketId,
        bucketPath,
      });

      await dbSchedule.save();

      res.render("dbschedule", {
        layout: "index",
        dbSchedule: dbSchedule.formatV1(),
        buckets: await Bucket.findAll(),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/dbschedule/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const dbSchedule = await DBSchedule.findByPk(id);
      if (!dbSchedule) throw new APIError("DBSchedule not found", true);

      const buckets = await Bucket.findAll();
      res.render("dbschedule", {
        layout: "index",
        dbSchedule: dbSchedule.formatV1(),
        buckets,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/dbschedule/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const dbSchedule = await DBSchedule.findByPk(id);
      if (!dbSchedule) throw new APIError("DBSchedule not found", true);

      const {
        name,
        dbUri,
        dbType,
        backupIntervalSeconds,
        backupRetentionSeconds,
        bucketId,
        bucketPath,
      } = req.body;

      logger.info("DBSchedule updated", {
        name,
        dbUri,
        dbType,
        backupIntervalSeconds,
        backupRetentionSeconds,
        bucketId,
        bucketPath,
      });

      const bucket = await Bucket.findByPk(bucketId);
      if (!bucket) throw new APIError("Bucket not found", true);

      dbSchedule.name = name;
      dbSchedule.dbURI = dbUri;
      dbSchedule.dbType = dbType;
      dbSchedule.backupIntervalSeconds = Number(backupIntervalSeconds);
      dbSchedule.backupRetentionSeconds = Number(backupRetentionSeconds);
      dbSchedule.bucketId = bucketId;
      dbSchedule.bucketPath = bucketPath;

      await dbSchedule.save();

      res.render("dbschedule", {
        layout: "index",
        dbSchedule: dbSchedule.formatV1(),
        buckets: await Bucket.findAll(),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/dbschedule/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dbSchedule = await DBSchedule.findByPk(req.params.id);
      if (!dbSchedule) throw new APIError("DBSchedule not found", true);

      // delete backups related to this dbschedule
      const backups = await Backup.findAll({
        where: {
          dbScheduleId: dbSchedule.id,
        },
      });

      for (const backup of backups) {
        await deleteBackup(backup);
      }

      await dbSchedule.destroy();

      res.redirect("/");
    } catch (error) {
      next(error);
    }
  },
);

export default router;