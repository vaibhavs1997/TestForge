import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Settings2 } from 'lucide-react';
import { useNotificationInbox } from '../../modules/notification/hooks';
import { useNotificationReadStore } from '../../store/notificationReadStore';
import type { NotificationInboxItem } from '../../modules/notification/types/inbox';
import { Toast } from './Toast';
import { NOTIFICATION_INBOX_POLL_INTERVAL_MS } from '../../constants/timeouts';
import { appPaths, projectModulePath } from '../../routes/paths';

const INBOX_FAST_POLL_MS = 2000;

const severityDot: Record<NotificationInboxItem['severity'], string> = {
  info: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [liveToastOpen, setLiveToastOpen] = useState(false);
  const [liveToastMessage, setLiveToastMessage] = useState('');

  const { data: items = [], isLoading, isError } = useNotificationInbox({
    pollIntervalMs: open ? INBOX_FAST_POLL_MS : NOTIFICATION_INBOX_POLL_INTERVAL_MS,
  });
  const { isRead, markRead, markAllRead } = useNotificationReadStore();
  const { projectId } = useParams<{ projectId?: string }>();

  const unreadCount = items.filter((n) => !isRead(n.id)).length;

  useEffect(() => {
    if (isLoading) return;
    const currentIds = new Set(items.map((i) => i.id));
    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds;
      return;
    }
    const newUnread = items.filter(
      (item) => !knownIdsRef.current!.has(item.id) && !isRead(item.id),
    );
    knownIdsRef.current = currentIds;
    if (newUnread.length > 0 && !open) {
      const latest = newUnread[0];
      setLiveToastMessage(
        newUnread.length === 1 ? latest.title : `${newUnread.length} new notifications`,
      );
      setLiveToastOpen(true);
    }
  }, [items, isLoading, isRead, open]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const alertRulesPath = projectId
    ? projectModulePath(projectId, 'notifications')
    : appPaths.projects;

  const panel = open && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={panelRef}
        className="fixed right-4 top-16 z-[100] w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-label="Notifications"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text">Notifications</h3>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                type="button"
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-text"
                title="Mark all as read"
                onClick={() => markAllRead(items.map((i) => i.id))}
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <Link
              to={alertRulesPath}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-text"
              title="Alert rules"
              onClick={() => setOpen(false)}
            >
              <Settings2 className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          {isLoading && items.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}
          {isError && (
            <p className="px-4 py-8 text-center text-sm text-error">Could not load notifications.</p>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-text-secondary">
              No activity yet. Events from all projects will appear here.
            </p>
          )}
          {items.map((item) => {
            const read = isRead(item.id);
            const auditPath = projectModulePath(item.projectId, 'audit');
            return (
              <Link
                key={item.id}
                to={auditPath}
                className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-elevated/50 ${
                  read ? 'opacity-70' : 'bg-primary/5'
                }`}
                onClick={() => {
                  markRead(item.id);
                  setOpen(false);
                }}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot[item.severity]}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{item.message}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">{formatTime(item.timestamp)}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-border px-4 py-2 text-center">
          <span className="text-[10px] text-text-secondary">Live - refreshes every few seconds</span>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          className={`relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text ${
            open ? 'bg-surface-elevated text-text' : ''
          }`}
          aria-label="Notifications"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {panel}
      </div>

      <Toast
        message={liveToastMessage}
        open={liveToastOpen}
        type="info"
        onClose={() => setLiveToastOpen(false)}
      />
    </>
  );
};

export default NotificationBell;
