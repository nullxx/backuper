import { startBackupJob, stopBackupJob } from "./backup";


export async function startJobs() {
    if (process.env.RUN_JOBS === 'false') return;

    await startBackupJob();
}

export async function stopJobs() {
    if (process.env.RUN_JOBS === 'false') return;

    await stopBackupJob();
}