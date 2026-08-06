import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationReadState {
  readIds: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  isRead: (id: string) => boolean;
}

export const useNotificationReadStore = create<NotificationReadState>()(
  persist(
    (set, get) => ({
      readIds: [],
      markRead: (id) =>
        set((state) =>
          state.readIds.includes(id) ? state : { readIds: [...state.readIds, id] }
        ),
      markAllRead: (ids) =>
        set((state) => ({
          readIds: Array.from(new Set([...state.readIds, ...ids])),
        })),
      isRead: (id) => get().readIds.includes(id),
    }),
    { name: 'testforge-notification-read' }
  )
);
