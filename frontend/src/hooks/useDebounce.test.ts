import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const hook = renderHook(() => useDebounce('hello', 500));
    expect(hook.result.current).toBe('hello');
  });

  it('debounces value changes', () => {
    const hook = renderHook(({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    hook.rerender({ value: 'updated', delay: 500 });
    expect(hook.result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(hook.result.current).toBe('updated');
  });

  it('cancels previous timeout on rapid changes', () => {
    const hook = renderHook(({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay), {
      initialProps: { value: 'first', delay: 500 },
    });

    hook.rerender({ value: 'second', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(hook.result.current).toBe('first');

    hook.rerender({ value: 'third', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(hook.result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(hook.result.current).toBe('third');
  });

  it('updates when delay changes', () => {
    const hook = renderHook(({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay), {
      initialProps: { value: 'hello', delay: 1000 },
    });

    hook.rerender({ value: 'world', delay: 500 });
    expect(hook.result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(hook.result.current).toBe('world');
  });
});