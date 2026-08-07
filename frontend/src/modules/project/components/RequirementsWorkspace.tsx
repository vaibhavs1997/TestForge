import React from 'react';
import { Routes, Route, NavLink, useLocation, useParams } from 'react-router-dom';
import { RequirementsPage } from '../../requirements/pages/RequirementsPage';
import { AnalysisPage } from '../../analysis/pages/AnalysisPage';
import { AssertionLibraryPage } from '../../assertion/pages/AssertionLibraryPage';

interface RequirementsWorkspaceProps {
  projectId: string;
}

/** Sub-nav: only screens with distinct routes. Review flow (strategy / test cases / execution) lives in the requirement review dialog. */
const SUB_NAV_ITEMS = [
  { key: '', label: 'Requirements', path: '' },
  { key: 'analysis', label: 'Analysis', path: '/analysis' },
  { key: 'assertions', label: 'Assertions', path: '/assertions' },
];

export const RequirementsWorkspace: React.FC<RequirementsWorkspaceProps> = ({ projectId }) => {
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId || routeProjectId || '1';

  const subPath = location.pathname.replace(`/projects/${activeProjectId}/requirements`, '');
  const activeSub = subPath === '' || subPath === '/' ? '' : subPath;

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-1 border-b border-border bg-surface px-6 py-2'>
        {SUB_NAV_ITEMS.map((item) => {
          const fullPath = `/projects/${activeProjectId}/requirements${item.path}`;
          const isActive = activeSub === item.path || (item.path === '' && (activeSub === '' || activeSub === '/'));
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
        <span className='ml-auto hidden text-xs text-text-secondary sm:inline'>
          Open a requirement → Review to generate & curate test cases
        </span>
      </div>
      <div className='flex-1 overflow-y-auto'>
        <Routes>
          <Route path='/' element={<RequirementsPage />} />
          <Route path='analysis' element={<AnalysisPage />} />
          <Route path='assertions' element={<AssertionLibraryPage />} />
          <Route path='*' element={<RequirementsPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default RequirementsWorkspace;
