import { startServer } from "./api";
import Logger from "./lib/logger";
import { launch, unlaunch } from "./launch";

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

  await unlaunch().catch((error) => logger.error("Error unlaunching at cleanup", error));

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

    // call launch (database, jobs): if config exists will proceed, if not do nothing
    await launch().catch((error) => logger.error("Error launching at startup", error));
    
    // server
    const port = await startServer();
    logger.info(`Server started at port ${port}`);

    registerEvents();

  } catch (error) {
    logger.error(error);
  }
}

main();
