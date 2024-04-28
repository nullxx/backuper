import fs from 'fs';

export enum ConfigType {
    DB = 'config/db.json',
}

export async function writeConfig(to: ConfigType, config: Record<string, unknown>) {
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
}

export async function readConfig(from: ConfigType) {
    if (!fs.existsSync(from)) {
        return {};
    }

    const data = await fs.promises.readFile(from, 'utf-8');
    return JSON.parse(data);
}

export function configExists(path: ConfigType) {
    return fs.existsSync(path);
}