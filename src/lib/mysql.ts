import mysql, { Connection, ConnectionOptions } from "mysql2/promise";
import compressing from "compressing";
import { promises as fsPromises } from "fs";
import fs from "fs";
import Logger from "./logger";
import { execute } from "./exec";
import parseDbUri from 'parse-db-uri';
import nodePath from "path";

const logger = Logger();

export async function createMySQLConnection(
  config: ConnectionOptions,
): Promise<Connection> {
  return mysql.createConnection(config);
}

export async function doMySQLBackupToFile({
  uri,
  path,
  compressFile = true,
}: {
  uri: string;
  path: string;
  compressFile: boolean;
}): Promise<string> {
  if (!path.endsWith(".sql")) {
    path = path.concat(".sql");
  }

  const connectionOpts = parseDbUri(uri);
  const cmd = [
    "mysqldump",
    "-h",
    connectionOpts.host,
    "-u",
    connectionOpts.user,
    "-P",
    `${connectionOpts.port}`,
    "-p" + `'${connectionOpts.password}`,
    "--add-drop-table", // add drop table to each table
    connectionOpts.database,
    ">",
    path
  ].join(" ");

  await execute(cmd);

  let newPath = path;
  if (compressFile) {
    const oldExtension = nodePath.extname(path);
    newPath = path.concat(oldExtension, ".gz");

    await new Promise((resolve, reject) => {
      new compressing.gzip.FileStream({ source: path }) // more efficient using streams
        .on("error", reject)
        .pipe(fs.createWriteStream(newPath))
        .on("error", reject)
        .on("finish", resolve);
    });

    // await compressing.gzip.compressFile(path, newPath);

    await fsPromises.unlink(path);
  }

  return newPath;
}
