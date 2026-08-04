import React from 'react';
import { Routes, Route, NavLink, useLocation, useParams } from 'react-router-dom';
import { RequirementsPage } from '../../requirements/pages/RequirementsPage';
import { AnalysisPage } from '../../analysis/pages/AnalysisPage';
import { AssertionLibraryPage } from '../../assertion/pages/AssertionLibraryPage';

interface RequirementsWorkspaceProps {
  projectId: string;
}

const SUB_NAV_ITEMS = [
  { key: '', label: 'Requirements', path: '' },
  { key: 'analysis', label: 'Analysis', path: '/analysis' },
  { key: 'readiness', label: 'Readiness', path: '/readiness' },
  { key: 'strategy', label: 'Strategy', path: '/strategy' },
  { key: 'design', label: 'Design', path: '/design' },
  { key: 'assertions', label: 'Assertions', path: '/assertions' },
  { key: 'execution-plan', label: 'Execution Plans', path: '/execution-plan' },
];

export const RequirementsWorkspace: React.FC<RequirementsWorkspaceProps> = ({ projectId }) => {
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId || routeProjectId || '1';

  // Determine active sub-tab from URL
  const subPath = location.pathname.replace(`/projects/${activeProjectId}/requirements`, '');
  const activeSub = subPath === '' || subPath === '/' ? '' : subPath;

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-1 border-b border-border bg-surface px-6 py-2'>
        {SUB_NAV_ITEMS.map((item) => {
          const fullPath = `/projects/${activeProjectId}/requirements${item.path}`;
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
          {/* Requirements - main requirements list with review dialog (Readiness, Strategy, Design, Execution Plans) */}
          <Route path='/' element={<RequirementsPage />} />
          <Route path='readiness' element={<RequirementsPage />} />
          <Route path='strategy' element={<RequirementsPage />} />
          <Route path='design' element={<RequirementsPage />} />
          <Route path='execution-plan' element={<RequirementsPage />} />
          {/* Analysis - standalone analysis page */}
          <Route path='analysis' element={<AnalysisPage />} />
          {/* Assertions - standalone assertion library */}
          <Route path='assertions' element={<AssertionLibraryPage />} />
          {/* Default to requirements */}
          <Route path='*' element={<RequirementsPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default RequirementsWorkspace;