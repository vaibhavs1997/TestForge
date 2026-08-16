import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { ProjectsHomePage } from './ProjectsHomePage';
import { projectStore } from '../../../store/projectStore';

const createProjectAsync = vi.fn();
const updateProjectAsync = vi.fn();
const deleteProjectAsync = vi.fn();

vi.mock('../hooks/useWorkspaceProjects', () => ({
  useWorkspaceProjects: () => ({
    projects: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    createProjectAsync,
    updateProjectAsync,
    deleteProjectAsync,
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../../utils/authFlash', () => ({
  consumeAuthFlash: () => null,
}));

describe('ProjectsHomePage integration', () => {
  beforeEach(() => {
    createProjectAsync.mockReset();
    updateProjectAsync.mockReset();
    deleteProjectAsync.mockReset();
    projectStore.setState({ selectedProjectId: null });
  });

  afterEach(() => {
    projectStore.setState({ selectedProjectId: null });
  });

  it('submits the create project form and navigates to the new workspace', async () => {
    createProjectAsync.mockResolvedValueOnce({ id: 'proj-123', name: 'Alpha' });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsHomePage />} />
          <Route path="/projects/:projectId/overview" element={<div>Workspace route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    await user.type(screen.getByLabelText(/project name/i), 'Alpha');
    await user.type(screen.getByLabelText(/description/i), 'Primary workspace');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(createProjectAsync).toHaveBeenCalledWith({
      name: 'Alpha',
      description: 'Primary workspace',
    });
    expect(await screen.findByText('Workspace route')).toBeInTheDocument();
    expect(projectStore.getState().selectedProjectId).toBe('proj-123');
  });
});
