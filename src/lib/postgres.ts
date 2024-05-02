import { execute } from "./exec";
import Logger from "./logger";
import parseDbUri from 'parse-db-uri';

const logger = Logger();

export async function doPostgreSQLBackupToFile({
    uri,
    path,
    compressFile = true,
}: {
    uri: string;
    path: string;
    compressFile: boolean;
}): Promise<string> {
    if (compressFile) {
        path = path.concat(".sql.gz");
    } else {
        path = path.concat(".sql");
    }
    const connectionOpts = parseDbUri(uri);

    const cmd = [
        `PGPASSWORD='${connectionOpts.password}'`,
        `pg_dump --clean -h ${connectionOpts.host} -p ${connectionOpts.port} -U ${connectionOpts.user
        } -F ${compressFile ? "t" : "p"} ${connectionOpts.database} > ${path}`,
    ].join(" ");

    await execute(cmd);

    return path;
}
