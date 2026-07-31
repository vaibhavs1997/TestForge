// External libraries
import { create } from 'zustand';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles

interface ProjectState {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

export const projectStore = create<ProjectState>((set) => ({
  selectedProjectId: typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null,
  setSelectedProjectId: (id) => {
    if (id) {
      localStorage.setItem('selectedProjectId', id);
    } else {
      localStorage.removeItem('selectedProjectId');
    }
    set({ selectedProjectId: id });
  },
}));

export default projectStore;
