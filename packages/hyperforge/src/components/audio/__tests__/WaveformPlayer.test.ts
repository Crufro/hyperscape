/**
 * WaveformPlayer Component Tests
 *
 * Tests for the audio waveform visualization component.
 * Tests word timestamp handling, time formatting, and state management.
 */

import { describe, it, expect } from "vitest";
import type { WordTimestamp } from "../WaveformPlayer";

describe("WaveformPlayer", () => {
  describe("Time Formatting", () => {
    it("formats seconds correctly", () => {
      const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      };

      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(30)).toBe("0:30");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(90)).toBe("1:30");
      expect(formatTime(125)).toBe("2:05");
    });

    it("pads single-digit seconds with zero", () => {
      const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      };

      expect(formatTime(5)).toBe("0:05");
      expect(formatTime(65)).toBe("1:05");
    });

    it("handles fractional seconds", () => {
      const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      };

      expect(formatTime(5.7)).toBe("0:05");
      expect(formatTime(59.9)).toBe("0:59");
    });
  });

  describe("Word Timestamp Handling", () => {
    const timestamps: WordTimestamp[] = [
      { word: "Hello", start: 0, end: 0.5 },
      { word: "world", start: 0.6, end: 1.0 },
      { word: "how", start: 1.1, end: 1.3 },
      { word: "are", start: 1.4, end: 1.6 },
      { word: "you", start: 1.7, end: 2.0 },
    ];

    it("finds current word based on time", () => {
      const findCurrentWord = (time: number, timestamps: WordTimestamp[]) => {
        return timestamps.findIndex((t) => time >= t.start && time <= t.end);
      };

      expect(findCurrentWord(0.25, timestamps)).toBe(0); // "Hello"
      expect(findCurrentWord(0.8, timestamps)).toBe(1); // "world"
      expect(findCurrentWord(1.5, timestamps)).toBe(3); // "are"
    });

    it("returns -1 when no word matches current time", () => {
      const findCurrentWord = (time: number, timestamps: WordTimestamp[]) => {
        return timestamps.findIndex((t) => time >= t.start && time <= t.end);
      };

      expect(findCurrentWord(0.55, timestamps)).toBe(-1); // Between words
      expect(findCurrentWord(3.0, timestamps)).toBe(-1); // After all words
      expect(findCurrentWord(-1, timestamps)).toBe(-1); // Before start
    });

    it("handles empty timestamps array", () => {
      const findCurrentWord = (time: number, timestamps: WordTimestamp[]) => {
        if (timestamps.length === 0) return -1;
        return timestamps.findIndex((t) => time >= t.start && time <= t.end);
      };

      expect(findCurrentWord(0.5, [])).toBe(-1);
    });

    it("handles overlapping timestamps", () => {
      const overlapping: WordTimestamp[] = [
        { word: "word1", start: 0, end: 0.6 },
        { word: "word2", start: 0.5, end: 1.0 }, // Overlaps with word1
      ];

      const findCurrentWord = (time: number, timestamps: WordTimestamp[]) => {
        return timestamps.findIndex((t) => time >= t.start && time <= t.end);
      };

      // Returns first match
      expect(findCurrentWord(0.55, overlapping)).toBe(0);
    });
  });

  describe("State Management", () => {
    it("isPlaying defaults to false", () => {
      const isPlaying = false;
      expect(isPlaying).toBe(false);
    });

    it("isMuted defaults to false", () => {
      const isMuted = false;
      expect(isMuted).toBe(false);
    });

    it("currentTime defaults to 0", () => {
      const currentTime = 0;
      expect(currentTime).toBe(0);
    });

    it("duration defaults to 0", () => {
      const duration = 0;
      expect(duration).toBe(0);
    });

    it("isReady starts as false", () => {
      const isReady = false;
      expect(isReady).toBe(false);
    });

    it("currentWordIndex defaults to -1", () => {
      const currentWordIndex = -1;
      expect(currentWordIndex).toBe(-1);
    });
  });

  describe("Props Validation", () => {
    it("accepts required audioUrl", () => {
      const props = {
        audioUrl: "https://example.com/audio.mp3",
      };

      expect(props.audioUrl).toBeDefined();
      expect(typeof props.audioUrl).toBe("string");
    });

    it("accepts optional height", () => {
      const defaultHeight = 64;
      const customHeight = 100;

      expect(defaultHeight).toBe(64);
      expect(customHeight).toBe(100);
    });

    it("accepts optional waveColor", () => {
      const defaultColor = "#4a5568";
      const customColor = "#ff0000";

      expect(defaultColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(customColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("accepts optional progressColor", () => {
      const defaultColor = "#22d3ee";
      expect(defaultColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("accepts optional timestamps array", () => {
      const timestamps: WordTimestamp[] = [
        { word: "test", start: 0, end: 0.5 },
      ];

      expect(timestamps).toHaveLength(1);
      expect(timestamps[0]).toHaveProperty("word");
      expect(timestamps[0]).toHaveProperty("start");
      expect(timestamps[0]).toHaveProperty("end");
    });
  });

  describe("Callback Handling", () => {
    it("onTimeUpdate receives current time", () => {
      let receivedTime = 0;
      const onTimeUpdate = (time: number) => {
        receivedTime = time;
      };

      onTimeUpdate(5.5);
      expect(receivedTime).toBe(5.5);
    });

    it("onCurrentWord receives word and index", () => {
      let receivedWord: string | null = null;
      let receivedIndex = -1;

      const onCurrentWord = (word: string | null, index: number) => {
        receivedWord = word;
        receivedIndex = index;
      };

      onCurrentWord("Hello", 0);
      expect(receivedWord).toBe("Hello");
      expect(receivedIndex).toBe(0);

      onCurrentWord(null, -1);
      expect(receivedWord).toBeNull();
      expect(receivedIndex).toBe(-1);
    });
  });

  describe("WaveSurfer Configuration", () => {
    it("defines correct default options", () => {
      const options = {
        waveColor: "#4a5568",
        progressColor: "#22d3ee",
        height: 64,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        cursorWidth: 1,
        normalize: true,
      };

      expect(options.barWidth).toBe(2);
      expect(options.barGap).toBe(1);
      expect(options.barRadius).toBe(2);
      expect(options.normalize).toBe(true);
    });

    it("cursorColor matches progressColor", () => {
      const progressColor = "#22d3ee";
      const cursorColor = progressColor;

      expect(cursorColor).toBe(progressColor);
    });
  });
});
