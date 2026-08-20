import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../constants/api';
import { notificationInboxQueryKey } from '../modules/notification/hooks';

function streamUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${base}/events/stream`;
  const url = path.startsWith('http') ? new URL(path) : new URL(path, window.location.origin);
  const apiKey = import.meta.env.VITE_API_KEY?.trim();
  if (apiKey) {
    url.searchParams.set('token', apiKey);
  }
  return url.toString();
}

/**
 * Subscribes to backend SSE and invalidates the notification inbox when events arrive.
 * Falls back silently if the stream is unavailable; the inbox remains stable until
 * the next explicit load or event-driven refresh.
 */
export function useActivityStream(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    let source: EventSource | null = null;
    try {
      source = new EventSource(streamUrl());
    } catch {
      return;
    }

    const onEvent = () => {
      void queryClient.invalidateQueries({ queryKey: notificationInboxQueryKey() });
    };

    source.addEventListener('domain-event', onEvent);
    source.onerror = () => {
      source?.close();
    };

    return () => {
      source?.removeEventListener('domain-event', onEvent);
      source?.close();
    };
  }, [enabled, queryClient]);
}

export default useActivityStream;
