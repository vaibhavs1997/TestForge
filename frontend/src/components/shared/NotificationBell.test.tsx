import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from './NotificationBell';
import { useNotificationReadStore } from '../../store/notificationReadStore';
import '@testing-library/jest-dom/vitest';

const mockUseNotificationInbox = vi.fn();

vi.mock('../../modules/notification/hooks', () => ({
  useNotificationInbox: (...args: unknown[]) => mockUseNotificationInbox(...args),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    mockUseNotificationInbox.mockReturnValue({
      data: [
        {
          id: 'notif-1',
          projectId: 'project-123',
          title: 'Execution completed',
          message: 'Project project-123 Execution completed successfully',
          module: 'Execution',
          action: 'COMPLETED',
          entityType: 'ExecutionRun',
          entityId: 'run-1',
          timestamp: Date.now(),
          severity: 'success',
        },
      ],
      isLoading: false,
      isError: false,
    });
    useNotificationReadStore.setState({ readIds: [] });
  });

  it('opens the notification panel and shows recent items', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/projects/project-123/overview']}>
        <Routes>
          <Route
            path="/projects/:projectId/*"
            element={<NotificationBell />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Execution completed')).toBeInTheDocument();
    expect(screen.getByText(/Project project-123/)).toBeInTheDocument();
  });
});
