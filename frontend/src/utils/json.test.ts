import { describe, it, expect } from 'vitest';
import { parseJson, stringifyJson } from './json';

describe('json utilities', () => {
  describe('parseJson', () => {
    it('parses valid JSON object', () => {
      const result = parseJson<{ name: string; age: number }>('{"name":"John","age":30}');
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('parses valid JSON array', () => {
      const result = parseJson<number[]>('[1,2,3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('parses nested JSON', () => {
      const json = '{"user":{"name":"John","address":{"city":"NYC"}}}';
      const result = parseJson<{ user: { name: string; address: { city: string } } }>(json);
      expect(result.user.address.city).toBe('NYC');
    });
  });

  describe('stringifyJson', () => {
    it('stringifies object with indentation', () => {
      const obj = { name: 'John', age: 30 };
      const result = stringifyJson(obj);
      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
    });

    it('stringifies array', () => {
      const arr = [1, 2, 3];
      const result = stringifyJson(arr);
      expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('handles nested objects', () => {
      const obj = { user: { name: 'John' } };
      const result = stringifyJson(obj);
      expect(result).toContain('"user"');
      expect(result).toContain('"name": "John"');
    });
  });
});