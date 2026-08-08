import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProject } from './useProject';
import type { ProjectFormData } from '../types';

describe('useProject hook', () => {
  it('returns initial projects from mock data', () => {
    const { result } = renderHook(() => useProject());
    expect(result.current.projects.length).toBeGreaterThan(0);
  });


  it('updates an existing project', () => {
    const { result } = renderHook(() => useProject());
    const projectToUpdate = result.current.projects[0];
    const originalUpdatedDate = projectToUpdate.updatedDate;

    act(() => {
      result.current.update(projectToUpdate.id, {
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'inactive',
      });
    });

    const updatedProject = result.current.projects.find((p) => p.id === projectToUpdate.id);
    expect(updatedProject?.name).toBe('Updated Project Name');
    expect(updatedProject?.description).toBe('Updated description');
    expect(updatedProject?.status).toBe('inactive');
    expect(updatedProject?.updatedDate).not.toBe(originalUpdatedDate);
  });

  it('creates a new project', () => {
    const { result } = renderHook(() => useProject());
    const initialCount = result.current.projects.length;

    let newProject: any;
    act(() => {
      newProject = result.current.create({
        name: 'New Test Project',
        description: 'Test description',
        status: 'active',
      });
    });

    expect(newProject.name).toBe('New Test Project');
    expect(newProject.description).toBe('Test description');
    expect(result.current.projects.length).toBe(initialCount + 1);
    expect(result.current.projects[0]).toEqual(newProject);
  });

  it('removes a project', () => {
    const { result } = renderHook(() => useProject());
    const initialCount = result.current.projects.length;
    const projectToRemove = result.current.projects[0];

    act(() => {
      result.current.remove(projectToRemove.id);
    });

    expect(result.current.projects.length).toBe(initialCount - 1);
    expect(result.current.projects.find((p) => p.id === projectToRemove.id)).toBeUndefined();
  });

  it('does not affect other projects when updating one', () => {
    const { result } = renderHook(() => useProject());
    const firstProject = result.current.projects[0];
    const secondProject = result.current.projects[1];

    act(() => {
      result.current.update(firstProject.id, {
        name: 'Only First Updated',
        description: firstProject.description,
        status: firstProject.status,
      });
    });

    const unchangedProject = result.current.projects.find((p) => p.id === secondProject.id);
    expect(unchangedProject?.name).toBe(secondProject.name);
    expect(unchangedProject?.updatedDate).toBe(secondProject.updatedDate);
  });

});