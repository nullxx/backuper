import { execute } from "./exec";
import Logger from "./logger";

const logger = Logger();
/**
 * Do Mongo backup to file [always compressed (.tar)]
 */
export async function doMongoBackupToFile({
  uri,
  path,
}: {
  uri: string;
  path: string;
}): Promise<string> {
  if (!path.endsWith(".gz")) {
    path = path.concat(".gz");
  }

  const cmd = `mongodump --uri "${uri}" --gzip --archive=${path}`;
  logger.debug(`Running command: ${cmd}`);

  const exitCode = await execute(cmd);

  if (exitCode !== 0) {
    throw new Error(`mongodump exited with code ${exitCode}`);
  }

  return path;
}
