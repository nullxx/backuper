import Logger from "./logger";
import { Sequelize } from "@sequelize/core";
import { MySqlDialect } from '@sequelize/mysql';

import { createMySQLConnection } from "./mysql";
import { ConfigType, readConfig, writeConfig } from "./fsconfig";
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

interface DBConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

export async function initialize(): Promise<Sequelize> {
  let dbConfig: DBConfig | null = null;

  const fsDbConfig = await readConfig(ConfigType.DB);
  if (fsDbConfig?.host && fsDbConfig?.username && fsDbConfig?.password && fsDbConfig?.database && fsDbConfig?.port) {
    dbConfig = {
      host: fsDbConfig.host,
      user: fsDbConfig.username,
      password: fsDbConfig.password,
      database: fsDbConfig.database,
      port: Number(fsDbConfig.port),
    };
  } else if (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE && process.env.MYSQL_PORT) {
    dbConfig = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: Number(process.env.MYSQL_PORT),
    };

    await writeConfig(ConfigType.DB, {
      host: dbConfig.host,
      username: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port.toString(),
    });
  }

  if (!dbConfig) throw new Error('Missing database configuration');

  const mysqlConnection = await createMySQLConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
  });

  await mysqlConnection.query(
    `CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`,
  );
  await mysqlConnection.end();


  currentDatabase = new Sequelize({
    dialect: MySqlDialect,
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
  await writeConfig(ConfigType.DB_INITIALIZED, { initialized: true });

  return currentDatabase;
}

export async function deinitalize() {
  logger.debug("## Deinitializing database ##");
  await currentDatabase?.close().catch((error) => logger.error(error));
  currentDatabase?.removeAllModels();

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

