import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCardMenu } from './ProjectCardMenu';
import '@testing-library/jest-dom/vitest';

describe('ProjectCardMenu', () => {
  it('shows Archive for active projects and Unarchive for archived projects', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    const onToggleArchive = vi.fn();
    const onDelete = vi.fn();

    const { unmount } = render(
      <ProjectCardMenu
        onRename={onRename}
        onToggleArchive={onToggleArchive}
        onDelete={onDelete}
        isArchived={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();

    unmount();

    render(
      <ProjectCardMenu
        onRename={onRename}
        onToggleArchive={onToggleArchive}
        onDelete={onDelete}
        isArchived
      />,
    );

    await user.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.getByRole('menuitem', { name: 'Unarchive' })).toBeInTheDocument();
  });
});
