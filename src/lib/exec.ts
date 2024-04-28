import { spawn } from "child_process";

export async function execute(cmd: string): Promise<number | null> {
  const res = spawn(cmd, { shell: true, stdio: "ignore", detached: true });

  return new Promise((resolve, reject) => {
    let resolved = false;

    function resolveOnce(code: number | null) {
      if (!resolved) {
        resolved = true;
        resolve(code);
      }
    }

    res
      .on("exit", (code) => resolveOnce(code))
      .on("close", (code) => resolveOnce(code))
      .on("error", reject);
  });
}
