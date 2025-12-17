/**
 * Logger Tests
 *
 * Tests for the Pino-based centralized logger utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, type ChildLogger } from "@/lib/utils/logger";

describe("Logger", () => {
  // Store original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    // Mock console methods to capture log output
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    vi.restoreAllMocks();
  });

  describe("logger object", () => {
    it("has all expected methods", () => {
      expect(typeof logger.trace).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.fatal).toBe("function");
      expect(typeof logger.child).toBe("function");
      expect(typeof logger.isDebugEnabled).toBe("function");
      expect(typeof logger.isInfoEnabled).toBe("function");
      expect(typeof logger.isTraceEnabled).toBe("function");
    });

    it("isDebugEnabled returns boolean", () => {
      const result = logger.isDebugEnabled();
      expect(typeof result).toBe("boolean");
    });

    it("isInfoEnabled returns boolean", () => {
      const result = logger.isInfoEnabled();
      expect(typeof result).toBe("boolean");
    });

    it("isTraceEnabled returns boolean", () => {
      const result = logger.isTraceEnabled();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("direct logging methods", () => {
    it("debug logs with tag and message", () => {
      // This should not throw
      expect(() => logger.debug("TestTag", "Test message")).not.toThrow();
    });

    it("info logs with tag and message", () => {
      expect(() => logger.info("TestTag", "Test info message")).not.toThrow();
    });

    it("warn logs with tag and message", () => {
      expect(() => logger.warn("TestTag", "Test warning")).not.toThrow();
    });

    it("error logs with tag and message", () => {
      expect(() => logger.error("TestTag", "Test error")).not.toThrow();
    });

    it("fatal logs with tag and message", () => {
      expect(() => logger.fatal("TestTag", "Fatal error")).not.toThrow();
    });

    it("trace logs with tag and message", () => {
      expect(() => logger.trace("TestTag", "Trace message")).not.toThrow();
    });

    it("debug logs with tag, message, and data object", () => {
      expect(() =>
        logger.debug("TestTag", "With data", { key: "value", num: 42 }),
      ).not.toThrow();
    });

    it("info logs with tag, message, and data object", () => {
      expect(() =>
        logger.info("TestTag", "With data", { userId: "123" }),
      ).not.toThrow();
    });

    it("error logs with tag, message, and Error object", () => {
      const error = new Error("Test error");
      expect(() =>
        logger.error("TestTag", "Error occurred", error),
      ).not.toThrow();
    });

    it("fatal logs with tag, message, and Error object", () => {
      const error = new Error("Fatal error");
      expect(() =>
        logger.fatal("TestTag", "Fatal occurred", error),
      ).not.toThrow();
    });

    it("logs with primitive data types", () => {
      expect(() =>
        logger.debug("TestTag", "String data", "hello"),
      ).not.toThrow();
      expect(() => logger.debug("TestTag", "Number data", 42)).not.toThrow();
      expect(() => logger.debug("TestTag", "Boolean data", true)).not.toThrow();
      expect(() => logger.debug("TestTag", "Null data", null)).not.toThrow();
    });

    it("logs with array data", () => {
      expect(() =>
        logger.debug("TestTag", "Array data", [1, 2, 3]),
      ).not.toThrow();
    });
  });

  describe("child logger", () => {
    it("creates a child logger with module name", () => {
      const childLog = logger.child("TestModule");
      expect(childLog).toBeDefined();
    });

    it("child logger has all log level methods", () => {
      const childLog = logger.child("TestModule");

      expect(typeof childLog.trace).toBe("function");
      expect(typeof childLog.debug).toBe("function");
      expect(typeof childLog.info).toBe("function");
      expect(typeof childLog.warn).toBe("function");
      expect(typeof childLog.error).toBe("function");
      expect(typeof childLog.fatal).toBe("function");
    });

    it("child debug logs message only", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.debug("Simple message")).not.toThrow();
    });

    it("child info logs message only", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.info("Info message")).not.toThrow();
    });

    it("child warn logs message only", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.warn("Warning message")).not.toThrow();
    });

    it("child error logs message only", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.error("Error message")).not.toThrow();
    });

    it("child fatal logs message only", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.fatal("Fatal message")).not.toThrow();
    });

    it("child trace logs message only", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.trace("Trace message")).not.toThrow();
    });

    it("child debug logs message with data object", () => {
      const childLog = logger.child("TestModule");
      expect(() =>
        childLog.debug("With object", { id: 123, name: "test" }),
      ).not.toThrow();
    });

    it("child info logs message with data object", () => {
      const childLog = logger.child("TestModule");
      expect(() =>
        childLog.info("With object", { status: "success" }),
      ).not.toThrow();
    });

    it("child warn logs message with data object", () => {
      const childLog = logger.child("TestModule");
      expect(() =>
        childLog.warn("With object", { warning: "deprecated" }),
      ).not.toThrow();
    });

    it("child error logs with Error object", () => {
      const childLog = logger.child("TestModule");
      const error = new Error("Test error");
      expect(() => childLog.error("Error occurred", error)).not.toThrow();
    });

    it("child fatal logs with Error object", () => {
      const childLog = logger.child("TestModule");
      const error = new Error("Fatal error");
      expect(() => childLog.fatal("Fatal occurred", error)).not.toThrow();
    });

    it("child logs with object as first argument", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.debug({ context: "data" })).not.toThrow();
      expect(() => childLog.info({ context: "data" })).not.toThrow();
      expect(() => childLog.warn({ context: "data" })).not.toThrow();
    });

    it("child error with Error as first argument", () => {
      const childLog = logger.child("TestModule");
      const error = new Error("Direct error");
      expect(() => childLog.error(error)).not.toThrow();
    });

    it("child fatal with Error as first argument", () => {
      const childLog = logger.child("TestModule");
      const error = new Error("Direct fatal");
      expect(() => childLog.fatal(error)).not.toThrow();
    });

    it("child logs with primitive data types", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.debug("Message", "string data")).not.toThrow();
      expect(() => childLog.debug("Message", 42)).not.toThrow();
      expect(() => childLog.debug("Message", true)).not.toThrow();
      expect(() => childLog.debug("Message", null)).not.toThrow();
    });

    it("child logs with array data", () => {
      const childLog = logger.child("TestModule");
      expect(() => childLog.debug("Message", [1, 2, 3])).not.toThrow();
    });

    it("creates multiple independent child loggers", () => {
      const childLog1 = logger.child("Module1");
      const childLog2 = logger.child("Module2");

      expect(childLog1).not.toBe(childLog2);
      expect(() => childLog1.debug("From module 1")).not.toThrow();
      expect(() => childLog2.debug("From module 2")).not.toThrow();
    });
  });

  describe("ChildLogger type", () => {
    it("conforms to ChildLogger interface", () => {
      const childLog: ChildLogger = logger.child("TypeTest");

      // Type assertion - these would fail at compile time if wrong
      const trace: (msg: string) => void = childLog.trace;
      const debug: (msg: string) => void = childLog.debug;
      const info: (msg: string) => void = childLog.info;
      const warn: (msg: string) => void = childLog.warn;
      const error: (msg: string) => void = childLog.error;
      const fatal: (msg: string) => void = childLog.fatal;

      expect(trace).toBeDefined();
      expect(debug).toBeDefined();
      expect(info).toBeDefined();
      expect(warn).toBeDefined();
      expect(error).toBeDefined();
      expect(fatal).toBeDefined();
    });
  });
});
