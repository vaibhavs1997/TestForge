import React from 'react';
import { Routes, Route, NavLink, useLocation, useParams } from 'react-router-dom';
import { ExecutionPage } from '../../execution/pages/ExecutionPage';
import { ExecutionProfilePage } from '../../execution/pages/ExecutionProfilePage';
import { SuitePage } from '../../suite/pages/SuitePage';
import { SchedulerPage } from '../../scheduler/pages/SchedulerPage';
import { projectModulePath, projectModuleRootPath } from '../../../routes/paths';

interface ExecutionWorkspaceProps {
  projectId: string;
}

const SUB_NAV_ITEMS = [
  { key: '', label: 'Runs', path: '' },
  { key: 'suites', label: 'Suites', path: '/suites' },
  { key: 'profiles', label: 'Profiles', path: '/profiles' },
  { key: 'scheduler', label: 'Schedule', path: '/scheduler' },
];

export const ExecutionWorkspace: React.FC<ExecutionWorkspaceProps> = ({ projectId }) => {
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId || routeProjectId || '1';

  // Determine active sub-tab from URL
  const subPath = location.pathname.replace(projectModuleRootPath(activeProjectId, 'execution'), '');
  const activeSub = subPath === '' || subPath === '/' ? '' : subPath;

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-1 border-b border-border bg-surface px-6 py-2'>
        {SUB_NAV_ITEMS.map((item) => {
          const fullPath = projectModulePath(activeProjectId, 'execution', item.path);
          const isActive = activeSub === item.path;
          return (
            <NavLink
              key={item.key}
              to={fullPath}
              className={() =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-surface hover:text-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          );
        })}
      </div>
      <div className='flex-1 overflow-y-auto'>
        <Routes>
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
      </div>
    </div>
  );
};

export default ExecutionWorkspace;
