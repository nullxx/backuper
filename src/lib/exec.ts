import { exec } from "child_process";

export async function execute(cmd: string) {

  return new Promise<number>((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Exec error: ${stderr || stdout}`));
      }

      resolve(0);
    });
  })
}

export async function which(cmd: string) {
  return await execute(`which ${cmd}`);
}