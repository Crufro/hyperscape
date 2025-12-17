/**
 * TypedEventEmitter Tests
 *
 * Tests for the type-safe event emitter implementation.
 * Each test creates its own emitter instance to avoid test pollution.
 */

import { describe, it, expect, vi } from "vitest";
import { TypedEventEmitter } from "@/lib/utils/typed-event-emitter";

// Define test event types for type safety
type TestEvents = {
  message: { text: string; timestamp: number };
  count: number;
  empty: undefined;
  complex: { nested: { value: string }; array: number[] };
};

// Factory function to create fresh emitter for each test
function createEmitter() {
  return new TypedEventEmitter<TestEvents>();
}

describe("TypedEventEmitter", () => {
  describe("on (subscribe)", () => {
    it("subscribes to an event", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("message", handler);

      expect(emitter.listenerCount("message")).toBe(1);
    });

    it("returns this for chaining", () => {
      const emitter = createEmitter();
      const result = emitter.on("message", vi.fn());
      expect(result).toBe(emitter);
    });

    it("allows multiple handlers for same event", () => {
      const emitter = createEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("message", handler1);
      emitter.on("message", handler2);

      expect(emitter.listenerCount("message")).toBe(2);
    });

    it("allows same handler for different events", () => {
      const emitter = createEmitter();
      const handler = vi.fn();

      emitter.on("message", handler as (data: TestEvents["message"]) => void);
      emitter.on("count", handler as (data: TestEvents["count"]) => void);

      expect(emitter.listenerCount("message")).toBe(1);
      expect(emitter.listenerCount("count")).toBe(1);
    });

    it("does not allow duplicate handlers for same event", () => {
      const emitter = createEmitter();
      const handler = vi.fn();

      emitter.on("message", handler);
      emitter.on("message", handler);

      // Set does not allow duplicates
      expect(emitter.listenerCount("message")).toBe(1);
    });
  });

  describe("addListener (alias for on)", () => {
    it("works the same as on", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      const result = emitter.addListener("message", handler);

      expect(emitter.listenerCount("message")).toBe(1);
      expect(result).toBe(emitter);
    });
  });

  describe("off (unsubscribe)", () => {
    it("unsubscribes from an event", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("message", handler);
      emitter.off("message", handler);

      expect(emitter.listenerCount("message")).toBe(0);
    });

    it("returns this for chaining", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("message", handler);
      const result = emitter.off("message", handler);

      expect(result).toBe(emitter);
    });

    it("does nothing if handler not registered", () => {
      const emitter = createEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("message", handler1);
      emitter.off("message", handler2);

      expect(emitter.listenerCount("message")).toBe(1);
    });

    it("does nothing if event has no listeners", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      // Should not throw
      expect(() => emitter.off("message", handler)).not.toThrow();
    });

    it("only removes specified handler", () => {
      const emitter = createEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("message", handler1);
      emitter.on("message", handler2);
      emitter.off("message", handler1);

      expect(emitter.listenerCount("message")).toBe(1);
    });
  });

  describe("removeListener (alias for off)", () => {
    it("works the same as off", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("message", handler);
      const result = emitter.removeListener("message", handler);

      expect(emitter.listenerCount("message")).toBe(0);
      expect(result).toBe(emitter);
    });
  });

  describe("emit", () => {
    it("calls handler with event data", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("message", handler);

      const eventData = { text: "hello", timestamp: Date.now() };
      emitter.emit("message", eventData);

      expect(handler).toHaveBeenCalledWith(eventData);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("returns true if event had listeners", () => {
      const emitter = createEmitter();
      emitter.on("message", vi.fn());
      const result = emitter.emit("message", { text: "test", timestamp: 0 });

      expect(result).toBe(true);
    });

    it("returns false if event had no listeners", () => {
      const emitter = createEmitter();
      const result = emitter.emit("message", { text: "test", timestamp: 0 });

      expect(result).toBe(false);
    });

    it("calls all handlers for an event", () => {
      const emitter = createEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      emitter.on("message", handler1);
      emitter.on("message", handler2);
      emitter.on("message", handler3);

      emitter.emit("message", { text: "test", timestamp: 0 });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it("passes correct data to handlers", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("count", handler);

      emitter.emit("count", 42);

      expect(handler).toHaveBeenCalledWith(42);
    });

    it("handles undefined event data", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("empty", handler);

      emitter.emit("empty", undefined);

      expect(handler).toHaveBeenCalledWith(undefined);
    });

    it("handles complex nested data", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on("complex", handler);

      const complexData = {
        nested: { value: "test" },
        array: [1, 2, 3],
      };
      emitter.emit("complex", complexData);

      expect(handler).toHaveBeenCalledWith(complexData);
    });

    it("catches and logs errors from handlers", () => {
      const emitter = createEmitter();
      const errorHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const successHandler = vi.fn();

      emitter.on("message", errorHandler);
      emitter.on("message", successHandler);

      // Should not throw, error is caught
      expect(() =>
        emitter.emit("message", { text: "test", timestamp: 0 }),
      ).not.toThrow();

      // Both handlers should be called
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it("continues calling handlers after one throws", () => {
      const emitter = createEmitter();
      const handler1 = vi.fn();
      const errorHandler = vi.fn(() => {
        throw new Error("Error");
      });
      const handler2 = vi.fn();

      emitter.on("message", handler1);
      emitter.on("message", errorHandler);
      emitter.on("message", handler2);

      emitter.emit("message", { text: "test", timestamp: 0 });

      // All handlers should be called
      expect(handler1).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe("once", () => {
    it("handler is called only once", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.once("message", handler);

      emitter.emit("message", { text: "first", timestamp: 0 });
      emitter.emit("message", { text: "second", timestamp: 1 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ text: "first", timestamp: 0 });
    });

    it("returns this for chaining", () => {
      const emitter = createEmitter();
      const result = emitter.once("message", vi.fn());
      expect(result).toBe(emitter);
    });

    it("listener is removed after first emit", () => {
      const emitter = createEmitter();
      emitter.once("message", vi.fn());

      expect(emitter.listenerCount("message")).toBe(1);

      emitter.emit("message", { text: "test", timestamp: 0 });

      expect(emitter.listenerCount("message")).toBe(0);
    });

    it("receives correct event data", () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.once("count", handler);

      emitter.emit("count", 99);

      expect(handler).toHaveBeenCalledWith(99);
    });
  });

  describe("removeAllListeners", () => {
    it("removes all listeners for specific event", () => {
      const emitter = createEmitter();
      emitter.on("message", vi.fn());
      emitter.on("message", vi.fn());
      emitter.on("count", vi.fn());

      emitter.removeAllListeners("message");

      expect(emitter.listenerCount("message")).toBe(0);
      expect(emitter.listenerCount("count")).toBe(1);
    });

    it("removes all listeners when no event specified", () => {
      const emitter = createEmitter();
      emitter.on("message", vi.fn());
      emitter.on("count", vi.fn());
      emitter.on("complex", vi.fn());

      emitter.removeAllListeners();

      expect(emitter.listenerCount("message")).toBe(0);
      expect(emitter.listenerCount("count")).toBe(0);
      expect(emitter.listenerCount("complex")).toBe(0);
    });

    it("returns this for chaining", () => {
      const emitter = createEmitter();
      const result = emitter.removeAllListeners("message");
      expect(result).toBe(emitter);
    });
  });

  describe("listenerCount", () => {
    it("returns 0 for event with no listeners", () => {
      const emitter = createEmitter();
      expect(emitter.listenerCount("message")).toBe(0);
    });

    it("returns correct count for event", () => {
      const emitter = createEmitter();
      emitter.on("message", vi.fn());
      emitter.on("message", vi.fn());
      emitter.on("message", vi.fn());

      expect(emitter.listenerCount("message")).toBe(3);
    });

    it("updates when listeners are added/removed", () => {
      const emitter = createEmitter();
      const handler = vi.fn();

      expect(emitter.listenerCount("message")).toBe(0);

      emitter.on("message", handler);
      expect(emitter.listenerCount("message")).toBe(1);

      emitter.off("message", handler);
      expect(emitter.listenerCount("message")).toBe(0);
    });
  });

  describe("eventNames", () => {
    it("returns empty array when no listeners", () => {
      const emitter = createEmitter();
      expect(emitter.eventNames()).toEqual([]);
    });

    it("returns array of event names with listeners", () => {
      const emitter = createEmitter();
      emitter.on("message", vi.fn());
      emitter.on("count", vi.fn());

      const names = emitter.eventNames();

      expect(names).toContain("message");
      expect(names).toContain("count");
      expect(names.length).toBe(2);
    });
  });

  describe("chaining", () => {
    it("supports method chaining", () => {
      const emitter = createEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter
        .on("message", handler1)
        .on("count", handler2)
        .once("empty", vi.fn())
        .off("message", handler1)
        .removeAllListeners("empty");

      expect(emitter.listenerCount("count")).toBe(1);
    });
  });

  describe("type safety", () => {
    it("enforces correct event data types", () => {
      const emitter = createEmitter();
      const messageHandler = (data: { text: string; timestamp: number }) => {
        expect(typeof data.text).toBe("string");
        expect(typeof data.timestamp).toBe("number");
      };

      const countHandler = (data: number) => {
        expect(typeof data).toBe("number");
      };

      emitter.on("message", messageHandler);
      emitter.on("count", countHandler);

      emitter.emit("message", { text: "hello", timestamp: 123 });
      emitter.emit("count", 42);
    });
  });
});
