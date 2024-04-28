import chalk from "chalk";
import stringify from "fast-safe-stringify";
import winston from "winston";
import sourceMapSupport from "source-map-support";
import { isMainThread } from 'worker_threads';

const STACK_FRAME_RE = new RegExp(/\w* at ((\S+)\s)?\(?([^:]+):(\d+):(\d+)/);
const THIS_FILE = __filename;

function getCaller() {
  const err = new Error();
  Error.captureStackTrace(err);

  // Throw away the first line of the trace
  const frames = err.stack?.split("\n").slice(1);
  if (!frames) return null;

  // Find the first line in the stack that doesn't name this module.
  let callerInfo: RegExpExecArray | null = null;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].indexOf(THIS_FILE) > -1) {
      callerInfo = STACK_FRAME_RE.exec(frames[i + 2]);
      break;
    }
  }

  if (
    callerInfo &&
    callerInfo[2] &&
    callerInfo[3] &&
    callerInfo[4] &&
    callerInfo[5]
  ) {
    const func = callerInfo[2];

    // now map that to the typescript source
    const tsInfo = sourceMapSupport.mapSourcePosition({
      source: callerInfo[3],
      line: parseInt(callerInfo[4]),
      column: parseInt(callerInfo[5]),
    });

    return {
      function: func,
      module: tsInfo.source,
      line: tsInfo.line,
      column: tsInfo.column,
    };
  }

  return null;
}

type logObject =
  | string
  | Record<string, unknown>
  | Record<string, unknown>[]
  | undefined;

const Logger = (...additionalParams: logObject[]): winston.Logger => {
  const initialLogs: logObject[] = [];

  initialLogs.push(...additionalParams);

  const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.errors(),
      winston.format.simple(),
    ),
    transports: [new winston.transports.Console()],
  });

  const wrapper =
    (original: winston.LeveledLogMethod) =>
      (...args: unknown[]) => {
        if (args.length === 0) original("");

        const logs = [new Date().toJSON(), isMainThread ? "main" : "worker"];

        const caller = getCaller();
        if (caller && caller.module) {
          const pathSplitted = caller.module.split("/");
          const srcIndex = pathSplitted.findIndex(
            (part: any) =>
              part === (process.env.NODE_ENV === "production" ? "dist" : "src"),
          );
          const projPath = pathSplitted.splice(srcIndex).join("/");
          logs.push(`${projPath}:${caller.line}:${caller.column}`);
        }

        logs.push(
          ...initialLogs.map((iarg) =>
            typeof iarg === "object" ? stringify(iarg) : `${iarg}`,
          ),
        );

        for (const arg of args) {
          if (arg instanceof Error) {
            // logs.push(chalk.red(arg.name));
            logs.push(chalk.red(arg.message));
            if (arg.stack) logs.push(chalk.red(arg.stack));
            const source = sourceMapSupport.getErrorSource(arg);
            if (source) logs.push(chalk.red(source));
          } else if (typeof arg === "object") {
            logs.push(stringify(arg));
          } else {
            logs.push(`${arg}`);
          }
        }

        return original(logs.join(" | "));
      };

  winstonLogger.error = wrapper(winstonLogger.error);
  winstonLogger.warn = wrapper(winstonLogger.warn);
  winstonLogger.info = wrapper(winstonLogger.info);
  winstonLogger.verbose = wrapper(winstonLogger.verbose);
  winstonLogger.debug = wrapper(winstonLogger.debug);
  winstonLogger.silly = wrapper(winstonLogger.silly);

  return winstonLogger;
};

export default Logger;
