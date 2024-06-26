import { Worker, isMainThread, parentPort } from 'worker_threads';

import Logger from "../lib/logger";
import { Backup, BackupStatus } from "../schemas/backup.schema";
import { DBSchedule } from "../schemas/dbschedule.schema";
import { Op } from "@sequelize/core";
import { createBackup, deleteBackup, nextDateBackup, nextDateDeleteBackup } from "../lib/backup";
import * as db from '../lib/database';

const intervalMS = 30 * 1000;
const timeoutWaitingToTerminateMS = 5 * 60 * 1000;

const logger = Logger();

const inBackup: Set<string> = new Set();
async function doBackup(dbSchedule: DBSchedule) {

  const backup = Backup.build({
    status: BackupStatus.IN_PROGRESS,
    bucketId: dbSchedule.bucketId,
    dbScheduleId: dbSchedule.id,
    deleteAt: await nextDateDeleteBackup(dbSchedule), // will be overwritten when backup is done, but in case of error, it will be deleted on that date
  });
  await backup.save();
  inBackup.add(backup.id);

  try {
    await createBackup(backup, dbSchedule);
  } catch (error) {
    logger.error(`Error creating backup for ${dbSchedule.name}`, error);
    backup.status = BackupStatus.FAILED;
    backup.message = (error as Error).message;
    await backup.save();
  }

  inBackup.delete(backup.id);
}

export async function doIt() {
  const dbSchedules = await DBSchedule.findAll();

  for (const dbSchedule of dbSchedules) {
    const nextDate = await nextDateBackup(dbSchedule);
    const now = new Date();
    if (nextDate <= now) {
      logger.debug(`Backup for ${dbSchedule.name}`);

      doBackup(dbSchedule);
    }
  }
}

const inDeletion: Set<string> = new Set();
async function del() {
  const backups = await Backup.findAll({
    where: {
      deleteAt: {
        [Op.or]: [
          {
            [Op.lt]: new Date(),
          },
          null,
        ]
      },
      status: {
        [Op.or]: [
          BackupStatus.FAILED,
          BackupStatus.COMPLETED,
        ]
      }
    },
  });

  for (const backup of backups) {
    if (inDeletion.has(backup.id)) {
      logger.debug(`Backup ${backup.id} is already in deletion!!!!!!`);
      continue;
    }

    inDeletion.add(backup.id);
    try {
      await deleteBackup(backup);
    } catch (error) {
      logger.error(`Error deleting backup ${backup.id}`, error);
    }

    inDeletion.delete(backup.id);
  }
}

async function checkStuckBackups() {
  // if the backup is in progress but is not inBackup, then it is stuck
  const backups = await Backup.findAll({
    where: {
      status: BackupStatus.IN_PROGRESS,
      id: {
        [Op.notIn]: Array.from(inBackup),
      },

      createdAt: {
        [Op.lt]: new Date(new Date().getTime() - 1000 * 60 * 5), // 5 minutes
      },
    },
  });

  for (const backup of backups) {
    logger.debug(`Found stuck backup ${backup.id} last updated ${backup.updatedAt}. Deleting it.`);
    await backup.destroy();
  }
}

let worker: Worker | null = null;
export async function startBackupJob() {
  worker = new Worker(__filename);

  return new Promise<void>((resolve, reject) => {
    worker?.on('online', resolve);
    worker?.on('error', reject);
  });
}

export async function stopBackupJob() {
  if (worker) {
    const promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("Timedout waiting for worker to exit"));
        worker?.terminate();
      }, timeoutWaitingToTerminateMS);
      worker?.on('exit', resolve);
      worker?.on('error', reject);
    });
    worker.postMessage('terminate');
    
    await promise.finally(() => { // finally will run even if the promise is rejected
      worker = null;
    });
  } else {
    // not a bad thing: could be that the worker was stopped to update db config but as db connection failed the worker was not started again. At program termination this is called but the worker is not active
    logger.warn("Called stopBackupJob but worker not active");
  }

  return Promise.resolve();
}

// wait until inBackup is empty and inDeletion is empty
async function waitToFinish() {
  return new Promise<void>((resolve) => {
    function check() {
      logger.debug("Checking if backup job is finished", `inBackup: ${inBackup.size}, inDeletion: ${inDeletion.size}`);
      if (inBackup.size === 0 && inDeletion.size === 0) {
        resolve();
        return;
      }

      setTimeout(check, 500);
    }

    check();
  });
}

if (!isMainThread) {
  logger.info("Backup job started");

  (async () => {
    await db.initialize();

    const schedule = (fn: () => Promise<void>, stopSignal: AbortController) => {
      let timeout: NodeJS.Timeout | null = null;

      const startTime = Date.now();
      fn().finally(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const sleepTime = Math.max(0, intervalMS - duration);

        const wrapperFn = () => {
          schedule(fn, stopSignal);
        }

        if (stopSignal.signal.aborted) {
          if (timeout) {
            clearTimeout(timeout);
          }
          return;
        }

        logger.debug(`Schedule ${fn.name} took ${duration}ms. Sleeping for ${sleepTime}ms`);
        timeout = setTimeout(wrapperFn, sleepTime);
      });
    }

    const doItFn = async () => {
      try {
        await doIt();
      } catch (error) {
        logger.error("Error doing backup", error);
      }
    }


    const delFn = async () => {
      try {
        await del();
      } catch (error) {
        logger.error("Error deleting backups", error);
      }
    }

    const stuckFn = async () => {
      try {
        await checkStuckBackups();
      } catch (error) {
        logger.error("Error checking stuck backups", error);
      }
    }

    const abortController = new AbortController();
    schedule(doItFn, abortController);
    schedule(delFn, abortController);
    schedule(stuckFn, abortController);

    parentPort?.on('message', async (message) => {
      logger.info("Received message", message, "from parent");
      if (message === "terminate") {
        logger.info("Backup job exiting");
        abortController.abort();

        await waitToFinish();
        await db.deinitalize();

        logger.info("Backup job exited");
        // setImmediate to wait the I/O to finish
        setImmediate(() => process.exit(0));
      }

    });

  })();

}

