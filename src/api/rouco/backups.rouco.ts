import { Router, Request, Response, NextFunction } from 'express';
import { nextDateBackup, deleteBackup } from '../../lib/backup';
import { Bucket } from '../../schemas/bucket.schema';
import { DBSchedule } from '../../schemas/dbschedule.schema';
import { Backup } from '../../schemas/backup.schema';
import { APIError } from '../error/APIError';

const router = Router();

router.get(
    "/backups/:dbschedule",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dbSchedule = await DBSchedule.findByPk(req.params.dbschedule);
            if (!dbSchedule) throw new APIError("DBSchedule not found", true);

            const bucket = await Bucket.findByPk(dbSchedule.bucketId);
            if (!bucket) throw new APIError("Bucket not found", true);

            const backups = await Backup.findAll({
                where: {
                    dbScheduleId: dbSchedule.id,
                },
                order: [["doneAt", "DESC"]],
            });

            const dbSchedules = await DBSchedule.findAll();
            res.render("main", {
                layout: "index",
                bucket: bucket.formatV1(),
                dbSchedule: dbSchedule.formatV1(),
                backups: await Promise.all(backups.map(async (backup) => {
                    return {
                        bucket: (await Bucket.findByPk(backup.bucketId))?.formatV1(),
                        ...backup.formatV1()
                    }
                })),
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
    },
);
router.delete(
    "/backups/:dbschedule",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dbSchedule = await DBSchedule.findByPk(req.params.dbschedule);
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

            res.send();
        } catch (error) {
            next(error);
        }
    },
);

router.delete(
    "/backup/:backupId",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const backup = await Backup.findByPk(req.params.backupId);
            if (!backup) throw new APIError("Backup not found", true);

            await deleteBackup(backup);
            res.send();
            // to here
        } catch (error) {
            next(error);
        }
    });

export default router;