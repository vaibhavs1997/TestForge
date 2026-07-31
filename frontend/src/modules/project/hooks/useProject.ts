// External libraries
import { useState, useCallback } from 'react';

// Shared types
import type { Project, ProjectFormData } from '../types';

// Mock data
import { initialProjects } from '../mock';

export const useProject = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const create = useCallback((data: ProjectFormData) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      status: data.status,
      createdDate: now,
      updatedDate: now,
    };
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const update = useCallback((id: string, data: ProjectFormData) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...data, updatedDate: now } : p
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    projects,
    create,
    update,
    remove,
  };
};

export default useProject;