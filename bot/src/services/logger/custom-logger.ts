import winston from "winston";
import winstonDailyRotateFile from "winston-daily-rotate-file";
const LOGGER_CATEGORY = "youngkiLogger";
const LOG_PREFIX = "ytdl-server";

export const LOG_PATH = `logs/${LOG_PREFIX}-log`;

class Logger {
  private static instance?: Logger;

  private dailyTransport?: winstonDailyRotateFile;
  private consoleTransport?: winston.transports.ConsoleTransportInstance;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
      Logger.instance.init();
    }

    return Logger.instance;
  }

  init(): void {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(info => {
        return `${new Date(
          info.timestamp as string | number | Date
        ).toLocaleString()} [${this.upperLogLevel(info.level)}] ${
          info.message
        }`;
      })
    );

    this.dailyTransport = new winstonDailyRotateFile({
      filename: `./${LOG_PATH}/${LOG_PREFIX}-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      level: process.env.LOG_LEVEL ?? "info",
      zippedArchive: true,
      maxSize: "5m",
      maxFiles: "100"
    });
    this.consoleTransport = new winston.transports.Console({
      level: process.env.LOG_LEVEL ?? "info"
    });

    winston.loggers.add(LOGGER_CATEGORY, {
      format: logFormat,
      transports: [this.dailyTransport, this.consoleTransport]
    });
  }

  upperLogLevel(level: string): string {
    let regex = /error|warn|info|verbose|debug|silly/;
    let matchStr = level.match(regex) ?? "";

    return level.replace(matchStr[0], matchStr[0].toUpperCase());
  }

  getLogger(): winston.Logger {
    return winston.loggers.get(LOGGER_CATEGORY);
  }

  setNewLogLevel(level: string): void {
    winston.loggers.get(LOGGER_CATEGORY).transports[0].level = level;
  }

  getLogLevel(): string {
    return winston.loggers.get(LOGGER_CATEGORY).transports[0].level ?? "info";
  }
}

export const glog = Logger.getInstance().getLogger();
