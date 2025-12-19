"use client";

import { useState, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface UseDialogueHistoryOptions {
  maxHistory?: number;
}

/**
 * Hook for undo/redo functionality in the dialogue editor
 */
export function useDialogueHistory(options: UseDialogueHistoryOptions = {}) {
  const { maxHistory = 50 } = options;

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  /**
   * Push a new state to history
   */
  const pushState = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      // Don't record if this is an undo/redo action
      if (isUndoRedoAction.current) {
        isUndoRedoAction.current = false;
        return;
      }

      setHistory((prev) => {
        // Remove any future states if we're not at the end
        const newHistory = prev.slice(0, currentIndex + 1);

        // Add new state
        newHistory.push({
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        });

        // Limit history size
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          setCurrentIndex((i) => Math.max(0, i));
          return newHistory;
        }

        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      });
    },
    [currentIndex, maxHistory],
  );

  /**
   * Initialize history with initial state
   */
  const initializeHistory = useCallback((nodes: Node[], edges: Edge[]) => {
    const initialState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    setHistory([initialState]);
    setCurrentIndex(0);
  }, []);

  /**
   * Undo to previous state
   */
  const undo = useCallback((): HistoryState | null => {
    if (!canUndo) return null;

    isUndoRedoAction.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [canUndo, currentIndex, history]);

  /**
   * Redo to next state
   */
  const redo = useCallback((): HistoryState | null => {
    if (!canRedo) return null;

    isUndoRedoAction.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [canRedo, currentIndex, history]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  /**
   * Get current state
   */
  const getCurrentState = useCallback((): HistoryState | null => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex];
    }
    return null;
  }, [currentIndex, history]);

  return {
    pushState,
    initializeHistory,
    undo,
    redo,
    clearHistory,
    getCurrentState,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex,
  };
}
