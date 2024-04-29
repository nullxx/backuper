import { startJobs, stopJobs } from './jobs';
import * as db from './lib/database';

export async function launch() {
    await db.initialize();
    if (db.isInitialized()) await startJobs();
}

export async function unlaunch() {
    await stopJobs();
    if (db.isInitialized()) await db.deinitalize();
}