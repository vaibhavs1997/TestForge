import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { ExecutionWorkspace } from './ExecutionWorkspace';

vi.mock('../../execution/pages/ExecutionPage', () => ({
  ExecutionPage: () => <div>Execution runs page</div>,
}));

vi.mock('../../execution/pages/ExecutionProfilePage', () => ({
  ExecutionProfilePage: () => <div>Execution profiles page</div>,
}));

vi.mock('../../suite/pages/SuitePage', () => ({
  SuitePage: () => <div>Suites page</div>,
}));

vi.mock('../../scheduler/pages/SchedulerPage', () => ({
  SchedulerPage: () => <div>Scheduler page</div>,
}));

describe('ExecutionWorkspace integration', () => {
  it('loads the route-specific module and navigates between execution tabs', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/projects/proj-1/execution/profiles']}>
        <Routes>
          <Route path="/projects/:projectId/execution/*" element={<ExecutionWorkspace projectId="proj-1" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Execution profiles page')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /schedule/i }));
    expect(await screen.findByText('Scheduler page')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /runs/i }));
    expect(await screen.findByText('Execution runs page')).toBeInTheDocument();
  });
});
