import winston from "winston";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3, // custom HTTP level
  debug: 4,
};
const isProd = process.env.NODE_ENV === "production";

const transports = [
  // new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  // new winston.transports.File({ filename: "logs/combined.log" }),
];
if (!isProd) transports.push(new winston.transports.Console());

const logger = winston.createLogger({
  levels,
  level: isProd ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()} ${message}`;
    })
  ),
  transports,
});

logger.http = (msg) => logger.log("http", msg);

export default logger;
