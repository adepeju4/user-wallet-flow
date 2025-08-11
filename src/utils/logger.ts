import {createLogger, transports, format} from 'winston';

const { combine, timestamp, errors, json, simple, colorize, printf } = format;


const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  const stackStr = stack ? `\n${stack}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}${stackStr}`;
});


const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'creator-co-api' },
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      )
    })
  ],
});

export default logger;
