import path from "path";
import { fileURLToPath } from 'node:url';
import Logger from "./logger";
import { Sequelize, importModels } from "@sequelize/core";
import { createMySQLConnection } from "./mysql";
import { ConfigType, readConfig } from "./fsconfig";
import { defineRelations } from "../schemas/relations";
import * as models from "../schemas";
const logger = Logger();

// (message: string) => logger.debug(message) instead of logger.debug beacause logger gets all the args, and we only want the first one

const runningHooks: (() => void)[] = [];
function goForHooks(database: Sequelize) {
  runningHooks.push(database.hooks.addListener("beforeConnect", () => {
    logger.debug("## Connecting to database ##");
  }),

    database.hooks.addListener("afterConnect", () => {
      logger.debug("## Connected to database ✅ ##");
    }),

    database.hooks.addListener('afterDisconnect', () => {
      logger.debug('## Disconnected from database ##');
    }),
  
  );

}

let currentDatabase: Sequelize | null = null;

export async function initialize(): Promise<Sequelize> {
  const fsDbConfig = await readConfig(ConfigType.DB);
  if (!fsDbConfig.host || !fsDbConfig.username || !fsDbConfig.password || !fsDbConfig.database || !fsDbConfig.port) {
    throw new Error('Missing database configuration');
  }

  const dbConfig = {
    host: fsDbConfig.host,
    username: fsDbConfig.username,
    password: fsDbConfig.password,
    database: fsDbConfig.database,
    port: Number(fsDbConfig.port),
  };
  const mysqlConnection = await createMySQLConnection({
    host: dbConfig.host,
    user: dbConfig.username,
    password: dbConfig.password,
    port: dbConfig.port,
  });

  await mysqlConnection.query(
    `CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`,
  );
  await mysqlConnection.end();


  currentDatabase = new Sequelize({
    dialect: "mysql",
    logging:
      process.env.MYSQL_LOGGING === "true"
        ? (message: string) => logger.debug(message)
        : false,
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci", // https://stackoverflow.com/a/367731/10226903
    },
    ...dbConfig,
    // models: await importModels(path.join(__dirname, "../schemas/**/*.schema.{ts,js}"))
    models: Object.values(models),
  });

  defineRelations();
  goForHooks(currentDatabase);

  await currentDatabase.sync({ alter: true });
  logger.info("## Database synced ##");

  return currentDatabase;
}

export async function deinitalize() {
  logger.debug("## Deinitializing database ##");
  await currentDatabase?.close().catch((error) => logger.error(error));

  runningHooks.forEach((delHook) => delHook());
  runningHooks.length = 0;

  currentDatabase = null;
}

export function isInitialized() {
  return Boolean(currentDatabase);
}

export async function test(): Promise<boolean> {
  try {
    if (!currentDatabase) throw new Error('Database not initialized');

    await currentDatabase.authenticate();
    return true;
  } catch (error) {
    return false;
  }
}

