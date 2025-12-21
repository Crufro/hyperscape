/**
 * Centralized Logger using Pino
 * Isomorphic - works in both Node.js and browser environments
 *
 * Wraps Pino with a simplified API that matches our existing usage pattern:
 *   const log = logger.child("ModuleName");
 *   log.debug("message", data);
 *
 * NOTE: We cannot use pino-pretty here because it depends on pino-abstract-transport
 * which requires worker_threads - not available in Next.js webpack bundled environments.
 * Instead, we use a custom prettifier that works everywhere.
 *
 * @see https://github.com/pinojs/pino
 */

import pino from "pino";

/**
 * Valid log data types for structured logging
 * Covers errors, objects, primitives, and arrays
 */
export type LogData =
  | Error
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | unknown;

const isBrowser = typeof window !== "undefined";

/**
 * Determine log level based on environment
 */
function getLogLevel(): pino.Level {
  if (isBrowser) {
    // In browser, check hostname for dev mode
    return window.location.hostname === "localhost" ? "debug" : "info";
  }
  // In Node.js, check environment variables
  const envLevel = process.env.LOG_LEVEL as pino.Level | undefined;
  if (envLevel) {
    return envLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Browser configuration for Pino
 * Uses console methods with module prefix for readability
 */
const browserConfig: pino.LoggerOptions["browser"] = {
  asObject: false, // Use native console formatting for better devtools experience
  write: {
    trace: (o: pino.LogDescriptor) =>
      console.debug(`[${o.module || "app"}]`, o.msg, o),
    debug: (o: pino.LogDescriptor) =>
      console.debug(`[${o.module || "app"}]`, o.msg, o),
    info: (o: pino.LogDescriptor) =>
      console.info(`[${o.module || "app"}]`, o.msg, o),
    warn: (o: pino.LogDescriptor) =>
      console.warn(`[${o.module || "app"}]`, o.msg, o),
    error: (o: pino.LogDescriptor) =>
      console.error(`[${o.module || "app"}]`, o.msg, o),
    fatal: (o: pino.LogDescriptor) =>
      console.error(`[FATAL][${o.module || "app"}]`, o.msg, o),
  },
};

// ANSI color codes for pretty logging
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

// Log level names and colors
const levelConfig: Record<number, { name: string; color: string }> = {
  10: { name: "TRACE", color: colors.dim },
  20: { name: "DEBUG", color: colors.cyan },
  30: { name: "INFO", color: colors.green },
  40: { name: "WARN", color: colors.yellow },
  50: { name: "ERROR", color: colors.red },
  60: { name: "FATAL", color: colors.magenta },
};

/**
 * Create a pretty formatting stream for development
 * This avoids pino-pretty's worker_threads dependency
 */
function createPrettyStream(): NodeJS.WritableStream {
  // eslint-disable-next-line no-undef, @typescript-eslint/no-require-imports
  const { Writable } = require("stream");

  return new Writable({
    write(
      chunk: Buffer,
      _encoding: string,
      callback: (error?: Error | null) => void,
    ) {
      try {
        const log = JSON.parse(chunk.toString());
        const time = new Date(log.time).toLocaleTimeString("en-US", {
          hour12: false,
        });
        const levelInfo = levelConfig[log.level] || {
          name: "???",
          color: colors.white,
        };
        const moduleName = log.module ? `[${log.module}]` : "";

        // Build the log line
        let line = `${colors.dim}${time}${colors.reset} ${levelInfo.color}${levelInfo.name}${colors.reset}`;
        if (moduleName) {
          line += ` ${colors.cyan}${moduleName}${colors.reset}`;
        }
        if (log.msg) {
          line += ` ${log.msg}`;
        }

        // Add extra data (excluding standard fields)
        const extraKeys = Object.keys(log).filter(
          (k) =>
            !["level", "time", "pid", "hostname", "module", "msg"].includes(k),
        );
        if (extraKeys.length > 0) {
          const extra: Record<string, unknown> = {};
          for (const k of extraKeys) {
            extra[k] = log[k];
          }
          line += ` ${colors.dim}${JSON.stringify(extra)}${colors.reset}`;
        }

        process.stdout.write(line + "\n");
        callback();
      } catch {
        // If parsing fails, just output raw
        process.stdout.write(chunk);
        callback();
      }
    },
  });
}

/**
 * Create the base Pino logger instance
 *
 * Uses a custom pretty stream in development to avoid pino-pretty's
 * worker_threads dependency which doesn't work in Next.js webpack.
 */
function createBaseLogger(): pino.Logger {
  const level = getLogLevel();

  if (isBrowser) {
    // Browser: use console-based output
    return pino({
      level,
      browser: browserConfig,
    });
  }

  // Production: use JSON output for structured logging
  if (process.env.NODE_ENV === "production") {
    return pino({ level });
  }

  // Development: use custom pretty stream (no worker_threads needed)
  return pino({ level }, createPrettyStream());
}

// Create the base logger instance
const baseLogger = createBaseLogger();

/**
 * Child logger type with our simplified API
 */
export interface ChildLogger {
  trace(messageOrData: string | LogData, data?: LogData): void;
  debug(messageOrData: string | LogData, data?: LogData): void;
  info(messageOrData: string | LogData, data?: LogData): void;
  warn(messageOrData: string | LogData, data?: LogData): void;
  error(messageOrData: string | LogData, data?: LogData): void;
  fatal(messageOrData: string | LogData, data?: LogData): void;
}

/**
 * Create a child logger wrapper that maintains our API
 * Converts: log.debug("message", data) → pino.debug({ data }, "message")
 */
function createChildLogger(pinoChild: pino.Logger): ChildLogger {
  return {
    trace: (messageOrData: string | LogData, data?: LogData) => {
      if (typeof messageOrData === "string") {
        if (data !== undefined) {
          pinoChild.trace(
            typeof data === "object" && data !== null ? data : { data },
            messageOrData,
          );
        } else {
          pinoChild.trace(messageOrData);
        }
      } else {
        pinoChild.trace(messageOrData as object, "");
      }
    },
    debug: (messageOrData: string | LogData, data?: LogData) => {
      if (typeof messageOrData === "string") {
        if (data !== undefined) {
          pinoChild.debug(
            typeof data === "object" && data !== null ? data : { data },
            messageOrData,
          );
        } else {
          pinoChild.debug(messageOrData);
        }
      } else {
        // First arg is data, use it as context
        pinoChild.debug(messageOrData as object, "");
      }
    },
    info: (messageOrData: string | LogData, data?: LogData) => {
      if (typeof messageOrData === "string") {
        if (data !== undefined) {
          pinoChild.info(
            typeof data === "object" && data !== null ? data : { data },
            messageOrData,
          );
        } else {
          pinoChild.info(messageOrData);
        }
      } else {
        pinoChild.info(messageOrData as object, "");
      }
    },
    warn: (messageOrData: string | LogData, data?: LogData) => {
      if (typeof messageOrData === "string") {
        if (data !== undefined) {
          pinoChild.warn(
            typeof data === "object" && data !== null ? data : { data },
            messageOrData,
          );
        } else {
          pinoChild.warn(messageOrData);
        }
      } else {
        pinoChild.warn(messageOrData as object, "");
      }
    },
    error: (messageOrData: string | LogData, data?: LogData) => {
      if (typeof messageOrData === "string") {
        if (data !== undefined) {
          // Handle Error objects specially
          if (data instanceof Error) {
            pinoChild.error({ err: data }, messageOrData);
          } else {
            pinoChild.error(
              typeof data === "object" && data !== null ? data : { data },
              messageOrData,
            );
          }
        } else {
          pinoChild.error(messageOrData);
        }
      } else {
        // First arg is data/error
        if (messageOrData instanceof Error) {
          pinoChild.error({ err: messageOrData }, "");
        } else {
          pinoChild.error(messageOrData as object, "");
        }
      }
    },
    fatal: (messageOrData: string | LogData, data?: LogData) => {
      if (typeof messageOrData === "string") {
        if (data !== undefined) {
          if (data instanceof Error) {
            pinoChild.fatal({ err: data }, messageOrData);
          } else {
            pinoChild.fatal(
              typeof data === "object" && data !== null ? data : { data },
              messageOrData,
            );
          }
        } else {
          pinoChild.fatal(messageOrData);
        }
      } else {
        if (messageOrData instanceof Error) {
          pinoChild.fatal({ err: messageOrData }, "");
        } else {
          pinoChild.fatal(messageOrData as object, "");
        }
      }
    },
  };
}

/**
 * Logger interface matching our existing API
 */
export interface Logger {
  trace(tag: string, message: string, data?: LogData): void;
  debug(tag: string, message: string, data?: LogData): void;
  info(tag: string, message: string, data?: LogData): void;
  warn(tag: string, message: string, data?: LogData): void;
  error(tag: string, message: string, data?: LogData): void;
  fatal(tag: string, message: string, data?: LogData): void;
  child(module: string): ChildLogger;
  isDebugEnabled(): boolean;
  isInfoEnabled(): boolean;
  isTraceEnabled(): boolean;
}

/**
 * Main logger export
 *
 * Usage:
 *   // Direct logging with tag
 *   logger.info("API", "Request completed", { status: 200 });
 *
 *   // Create a child logger for a module
 *   const log = logger.child("ImageGen");
 *   log.debug("Processing image", { width: 512 });
 *   log.error("Failed", error);
 */
export const logger: Logger = {
  trace: (tag: string, message: string, data?: LogData) => {
    const child = baseLogger.child({ module: tag });
    if (data !== undefined) {
      child.trace(
        typeof data === "object" && data !== null ? data : { data },
        message,
      );
    } else {
      child.trace(message);
    }
  },

  debug: (tag: string, message: string, data?: LogData) => {
    const child = baseLogger.child({ module: tag });
    if (data !== undefined) {
      child.debug(
        typeof data === "object" && data !== null ? data : { data },
        message,
      );
    } else {
      child.debug(message);
    }
  },

  info: (tag: string, message: string, data?: LogData) => {
    const child = baseLogger.child({ module: tag });
    if (data !== undefined) {
      child.info(
        typeof data === "object" && data !== null ? data : { data },
        message,
      );
    } else {
      child.info(message);
    }
  },

  warn: (tag: string, message: string, data?: LogData) => {
    const child = baseLogger.child({ module: tag });
    if (data !== undefined) {
      child.warn(
        typeof data === "object" && data !== null ? data : { data },
        message,
      );
    } else {
      child.warn(message);
    }
  },

  error: (tag: string, message: string, data?: LogData) => {
    const child = baseLogger.child({ module: tag });
    if (data !== undefined) {
      if (data instanceof Error) {
        child.error({ err: data }, message);
      } else {
        child.error(
          typeof data === "object" && data !== null ? data : { data },
          message,
        );
      }
    } else {
      child.error(message);
    }
  },

  fatal: (tag: string, message: string, data?: LogData) => {
    const child = baseLogger.child({ module: tag });
    if (data !== undefined) {
      if (data instanceof Error) {
        child.fatal({ err: data }, message);
      } else {
        child.fatal(
          typeof data === "object" && data !== null ? data : { data },
          message,
        );
      }
    } else {
      child.fatal(message);
    }
  },

  /**
   * Create a child logger with a fixed module name
   */
  child: (module: string): ChildLogger => {
    const pinoChild = baseLogger.child({ module });
    return createChildLogger(pinoChild);
  },

  /**
   * Check if debug level is enabled (for conditional expensive logging)
   */
  isDebugEnabled: (): boolean => {
    return baseLogger.isLevelEnabled("debug");
  },

  /**
   * Check if info level is enabled
   */
  isInfoEnabled: (): boolean => {
    return baseLogger.isLevelEnabled("info");
  },

  /**
   * Check if trace level is enabled
   */
  isTraceEnabled: (): boolean => {
    return baseLogger.isLevelEnabled("trace");
  },
};

// Also export the raw Pino logger for advanced use cases
export { baseLogger as pinoLogger };
