import { describe, it, expect } from 'vitest';
import { formatDate, formatDuration } from './date';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('formats date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatDate(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('formats current date', () => {
      const now = new Date();
      expect(formatDate(now)).toBe(now.toISOString());
    });
  });

  describe('formatDuration', () => {
    it('formats duration in milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('formats zero duration', () => {
      expect(formatDuration(0)).toBe('0ms');
    });

    it('formats large duration', () => {
      expect(formatDuration(1500)).toBe('1500ms');
    });
  });
});