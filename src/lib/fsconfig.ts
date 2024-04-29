import fs from 'fs';
import Logger from './logger';

export const fsConfigCacheEnabled = true;
export const fsConfigCacheTimeout = 1000 * 60 * 5;

const logger = Logger('fsConfigCache');

export enum ConfigType {
    DB = 'config/db.json',
    DB_INITIALIZED = 'config/db_initialized.json',
}

export interface DBConfig {
    host: string;
    username: string;
    password: string;
    database: string;
    port: string;
}

export interface DBInitialized {
    initialized: boolean;
}

type ConfigData = {
    [ConfigType.DB]: DBConfig;
    [ConfigType.DB_INITIALIZED]: DBInitialized;
};

export const fsConfigCache: Map<ConfigType, ConfigData[ConfigType]> = new Map();

function clearCache() {
    logger.debug('Clearing fsConfigCache');
    fsConfigCache.clear();
}

if (fsConfigCacheEnabled) {
    logger.debug(`Setiting cache expire to ${fsConfigCacheTimeout}ms`);
    setInterval(clearCache, fsConfigCacheTimeout);
}

function saveToCache<T extends ConfigType>(path: T, data: ConfigData[T]) {
    logger.debug(`Saving ${path} to cache`);
    fsConfigCache.set(path, data);
}

function getFromCache<T extends ConfigType>(path: T): ConfigData[T] | undefined {
    logger.debug(`Getting ${path} from cache`);
    return fsConfigCache.get(path) as ConfigData[T];
}

function isCached<T extends ConfigType>(path: T): boolean {
    return fsConfigCache.has(path);
}

export async function writeConfig<T extends ConfigType>(to: T, config: ConfigData[T]): Promise<void> {
    // create all directories in the path if they don't exist
    const dirs = to.split('/').slice(0, -1);
    let dir = '';
    for (const d of dirs) {
        dir += d + '/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    const data = JSON.stringify(config, null, 2);
    await fs.promises.writeFile(to, data);

    if (fsConfigCacheEnabled) {
        saveToCache(to, config);
    }
}

export async function readConfig<T extends ConfigType>(from: T): Promise<ConfigData[T] | undefined> {
    if (fsConfigCacheEnabled && isCached(from)) {
        return getFromCache(from);
    }

    if (!fs.existsSync(from)) {
        return undefined;
    }

    const data = await fs.promises.readFile(from, 'utf-8');
    let parsed;
    try {
        parsed = JSON.parse(data);
    } catch (error) {
        logger.error(`Error parsing ${from}: ${error}`);
        return undefined;
    }

    if (fsConfigCacheEnabled) {
        saveToCache(from, parsed);
    }

    return parsed;
}

export function configExists(path: ConfigType) {
    logger.debug(`Checking if ${path} exists`);
    return fs.existsSync(path);
}