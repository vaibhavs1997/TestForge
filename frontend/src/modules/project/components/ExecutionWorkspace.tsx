import React from 'react';
import { Routes, Route, NavLink, useLocation, useParams } from 'react-router-dom';
import { CalendarClock, ListChecks, Play, Settings } from 'lucide-react';
import { ExecutionPage } from '../../execution/pages/ExecutionPage';
import { ExecutionProfilePage } from '../../execution/pages/ExecutionProfilePage';
import { SuitePage } from '../../suite/pages/SuitePage';
import { SchedulerPage } from '../../scheduler/pages/SchedulerPage';
import { projectModulePath } from '../../../routes/paths';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { ProjectContextMissing } from '../../../components/shared/ProjectContextMissing';

interface ExecutionRenderBoundaryState {
  error: Error | null;
}

class ExecutionRenderBoundary extends React.Component<React.PropsWithChildren, ExecutionRenderBoundaryState> {
  state: ExecutionRenderBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ExecutionRenderBoundaryState {
    return { error };
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className='mx-auto max-w-3xl p-6'>
          <ErrorAlert
            title='Execution workspace could not be displayed'
            message={this.state.error.message || 'An unexpected rendering error occurred.'}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

interface ExecutionWorkspaceProps {
  projectId: string;
}

const SUB_NAV_ITEMS = [
  { key: '', label: 'Runs', path: '', icon: Play },
  { key: 'suites', label: 'Suites', path: '/suites', icon: ListChecks },
  { key: 'profiles', label: 'Profiles', path: '/profiles', icon: Settings },
  { key: 'scheduler', label: 'Schedule', path: '/scheduler', icon: CalendarClock },
];

export const ExecutionWorkspace: React.FC<ExecutionWorkspaceProps> = ({ projectId }) => {
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId || routeProjectId;

  if (!activeProjectId) return <ProjectContextMissing />;

  // Determine active sub-tab from URL
  const subPath = location.pathname.replace(projectModulePath(activeProjectId, 'execution'), '');
  const activeSub = subPath === '' || subPath === '/' ? '' : subPath;

  return (
    <div className='flex h-full min-h-0 flex-col gap-4 px-4 py-6 lg:h-[calc(100vh-4rem)] lg:flex-row lg:overflow-hidden lg:px-8'>
      <aside className='flex w-full shrink-0 flex-col rounded-2xl border border-border bg-surface p-4 lg:h-full lg:w-64 lg:overflow-y-auto'>
        <div className='border-b border-border px-2 pb-4'>
          <div className='flex items-center gap-2 text-lg font-semibold text-text'>
            <Play className='h-5 w-5 text-primary' />
            Execution Explorer
          </div>
          <p className='mt-1 px-7 text-xs text-text-secondary'>Run and manage project execution.</p>
        </div>
        <nav className='mt-3 space-y-1' aria-label='Execution sections'>
          {SUB_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const fullPath = projectModulePath(activeProjectId, 'execution', item.path);
            const isActive = activeSub === item.path;
            return (
              <NavLink
                key={item.key}
                to={fullPath}
                className={() =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-background hover:text-text'
                  }`
                }
              >
                <Icon className='h-4 w-4' />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <p className='mt-auto border-t border-border px-2 pt-4 text-xs text-text-secondary'>
          Select a section to manage execution.
        </p>
      </aside>
      {/* On desktop, only this content pane scrolls; the explorer stays static. */}
      <div className='min-w-0 flex-1 scrollbar-none lg:h-full lg:overflow-y-auto'>
        <ExecutionRenderBoundary>
          <Routes key={location.pathname}>
          {/* Execute - main execution page (also contains validation history in details) */}
          <Route path='/' element={<ExecutionPage />} />
          {/* Validation History - reuse execution page (history is shown in the runs list + details) */}
          <Route path='history' element={<ExecutionPage />} />
          {/* Suites - standalone suite page */}
          <Route path='suites' element={<SuitePage />} />
          {/* Profiles - standalone execution profile page */}
          <Route path='profiles' element={<ExecutionProfilePage />} />
          {/* Scheduler - standalone scheduler page */}
          <Route path='scheduler' element={<SchedulerPage />} />
          {/* Default to execute */}
          <Route path='*' element={<ExecutionPage />} />
          </Routes>
        </ExecutionRenderBoundary>
      </div>
    </div>
  );
};

export default ExecutionWorkspace;
