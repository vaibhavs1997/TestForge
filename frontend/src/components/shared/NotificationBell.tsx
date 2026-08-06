import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Settings2 } from 'lucide-react';
import { useNotificationInbox } from '../../modules/notification/hooks';
import { useNotificationReadStore } from '../../store/notificationReadStore';
import type { NotificationInboxItem } from '../../modules/notification/types/inbox';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: items = [], isLoading, isError } = useNotificationInbox();
  const { isRead, markRead, markAllRead } = useNotificationReadStore();
  const { projectId } = useParams<{ projectId?: string }>();

  const unreadCount = items.filter((n) => !isRead(n.id)).length;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', onDocClick);
    }
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const alertRulesPath = projectId
    ? `/projects/${projectId}/notifications`
    : '/projects';

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
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
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
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
            {!isLoading &&
              items.map((item) => {
                const read = isRead(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-elevated/50 ${
                      read ? 'opacity-70' : 'bg-primary/5'
                    }`}
                    onClick={() => markRead(item.id)}
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
                  </button>
                );
              })}
          </div>

          <div className="border-t border-border px-4 py-2 text-center">
            <span className="text-[10px] text-text-secondary">All projects · latest activity</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
