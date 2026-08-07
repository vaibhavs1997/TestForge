// External libraries
import { create } from 'zustand';

import { getScopedStorageKey } from '../services/authSession';

const STORAGE_BASE = 'selectedProjectId';

function readSelectedProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(getScopedStorageKey(STORAGE_BASE));
}

interface ProjectState {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

export const projectStore = create<ProjectState>((set) => ({
  selectedProjectId: readSelectedProjectId(),
  setSelectedProjectId: (id) => {
    if (typeof window !== 'undefined') {
      const key = getScopedStorageKey(STORAGE_BASE);
      if (id) {
        localStorage.setItem(key, id);
      } else {
        localStorage.removeItem(key);
      }
    }
    set({ selectedProjectId: id });
  },
}));

export default projectStore;
