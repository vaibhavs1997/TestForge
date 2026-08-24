import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProjectContextMissing } from './ProjectContextMissing';

const Location = () => <div data-testid="location">{useLocation().pathname}</div>;

describe('ProjectContextMissing', () => {
  it('explains the missing context and recovers to project selection', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route path="*" element={<><ProjectContextMissing /><Location /></>} />
          <Route path="/projects" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Project context is missing')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Go to Projects' }));
    expect(screen.getByTestId('location').textContent).toBe('/projects');
  });
});
