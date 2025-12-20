/**
 * useLiveServer - Hook for connecting to the live game server
 *
 * Provides real-time entity updates from the running Hyperscape game server
 * via HTTP polling. Used by the World Editor to show live game state.
 *
 * Note: WebSocket spectator mode requires authentication and a character ID,
 * so we use HTTP polling for the unauthenticated world editor instead.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/utils";

const log = logger.child("useLiveServer");

// Default server URL
const DEFAULT_HTTP_URL = "http://localhost:5555";

// Polling interval in milliseconds (1 second for near-real-time updates)
const DEFAULT_POLL_INTERVAL = 1000;

interface LiveEntity {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  modelPath?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  serverUrl: string;
  lastUpdate: number;
}

interface UseLiveServerOptions {
  /** HTTP URL for API (default: http://localhost:5555) */
  httpUrl?: string;
  /** Auto-connect on mount (default: false) */
  autoConnect?: boolean;
  /** Polling interval in ms (default: 1000) */
  pollInterval?: number;
}

interface UseLiveServerReturn {
  /** Current entities from the live server */
  entities: LiveEntity[];
  /** Connection state */
  connection: ConnectionState;
  /** Connect to the server (start polling) */
  connect: () => void;
  /** Disconnect from the server (stop polling) */
  disconnect: () => void;
  /** Refresh entities (one-time fetch) */
  refresh: () => Promise<void>;
}

/**
 * Hook for connecting to the live game server via HTTP polling
 */
export function useLiveServer(
  options: UseLiveServerOptions = {},
): UseLiveServerReturn {
  const {
    httpUrl = DEFAULT_HTTP_URL,
    autoConnect = false,
    pollInterval = DEFAULT_POLL_INTERVAL,
  } = options;

  const [entities, setEntities] = useState<LiveEntity[]>([]);
  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    serverUrl: httpUrl,
    lastUpdate: 0,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  /**
   * Fetch entities from the server
   */
  const fetchEntities = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${httpUrl}/api/world/entities`, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.entities) {
        setEntities(data.entities);
        setConnection((prev) => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
          lastUpdate: Date.now(),
        }));
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.name === "AbortError"
          ? "Request timeout"
          : error instanceof Error
            ? error.message
            : "Connection failed";

      setConnection((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [httpUrl]);

  /**
   * Start polling the server
   */
  const connect = useCallback(() => {
    if (isPollingRef.current) return;

    log.info("Starting live server polling", { url: httpUrl, pollInterval });

    isPollingRef.current = true;
    setConnection((prev) => ({
      ...prev,
      connecting: true,
      error: null,
    }));

    // Initial fetch
    fetchEntities().then((success) => {
      if (success) {
        log.info("Connected to live server", { url: httpUrl });
      }
    });

    // Start polling
    pollIntervalRef.current = setInterval(() => {
      if (isPollingRef.current) {
        fetchEntities();
      }
    }, pollInterval);
  }, [httpUrl, pollInterval, fetchEntities]);

  /**
   * Stop polling the server
   */
  const disconnect = useCallback(() => {
    log.info("Stopping live server polling");

    isPollingRef.current = false;

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setConnection((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
    }));
  }, []);

  /**
   * Refresh entities (one-time fetch)
   */
  const refresh = useCallback(async () => {
    await fetchEntities();
  }, [fetchEntities]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      isPollingRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [autoConnect, connect]);

  return {
    entities,
    connection,
    connect,
    disconnect,
    refresh,
  };
}
