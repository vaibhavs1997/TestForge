import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../constants/api';
import { notificationInboxQueryKey } from '../modules/notification/hooks';
import { getAuthAuthorizationHeader } from '../services/authSession';

function streamUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${base}/events/stream`;
  const url = path.startsWith('http') ? new URL(path) : new URL(path, window.location.origin);
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
    if (!enabled || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const authorization = getAuthAuthorizationHeader();
        const response = await fetch(streamUrl(), {
          signal: controller.signal,
          headers: authorization ? { Authorization: authorization } : undefined,
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events) {
            if (event.includes('event: domain-event') || event.includes('data:')) {
              void queryClient.invalidateQueries({ queryKey: notificationInboxQueryKey() });
            }
          }
        }
      } catch {
        // Stream is optional; the inbox remains available through normal queries.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, queryClient]);
}

export default useActivityStream;
