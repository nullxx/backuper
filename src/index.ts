import { startServer } from "./api";
import * as db from "./lib/database";
import Logger from "./lib/logger";
import { startJobs, stopJobs } from "./jobs";

const logger = Logger();

function verifyEnv() {
  const requiredEnv = [
    "NODE_ENV", // "production", "development"
    "RUN_JOBS", // "true", "false"
    "PORT", // "3000" ...
    "API_SESSION_SECRET", // "secret" ...
  ];

  const missingEnv = requiredEnv.filter(env => !process.env[env]);
  if (missingEnv.length) {
    throw new Error(`Missing environment variables: ${missingEnv.join(", ")}`);
  }
}

async function cleanup() {
  logger.info("Cleaning up");

  await stopJobs().catch((error) => logger.error("Error stopping jobs", error));
  await db.deinitalize().catch((error) => logger.error("Error deinitializing database at cleanup", error));

  logger.info("Cleaned up");
}

function registerEvents() {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception thrown', error);
    process.exit(1);
  });


  let alreadyHandling = false;
  ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'SIGTERM'].forEach(eventType => {
    process.on(eventType, async () => {
      if (alreadyHandling) return;
      alreadyHandling = true;

      logger.info(`Process exiting with code ${eventType}`);

      await cleanup();

      process.exit(0);
    });
  });
}

async function main() {
  try {
    verifyEnv();

    // database
    // call initialize: if config exists will proceed, if not do nothing
    await db.initialize().catch((error) => logger.error("Error initializing database at startup", error));

    if (db.isInitialized()) await startJobs();
    // server
    const port = await startServer();
    logger.info(`Server started at port ${port}`);

    registerEvents();

  } catch (error) {
    logger.error(error);
  }
}

main();
