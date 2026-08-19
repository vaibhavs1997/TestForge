import React from 'react';
import { Routes, Route, NavLink, useLocation, useParams } from 'react-router-dom';
import { Archive, BarChart3, CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react';
import { RequirementsPage } from '../../requirements/pages/RequirementsPage';
import { AnalysisPage } from '../../analysis/pages/AnalysisPage';
import { AssertionLibraryPage } from '../../assertion/pages/AssertionLibraryPage';
import { projectModulePath, projectModuleRootPath } from '../../../routes/paths';

interface RequirementsWorkspaceProps {
  projectId: string;
}

/** Sub-nav: only screens with distinct routes. Review flow (strategy / test cases / execution) lives in the requirement review dialog. */
const SUB_NAV_ITEMS = [
  { key: '', label: 'Requirements', path: '', icon: ClipboardList },
  { key: 'approved', label: 'Approved', path: '/approved', icon: CheckCircle2 },
  { key: 'archived', label: 'Archived', path: '/archived', icon: Archive },
  { key: 'analysis', label: 'Analysis', path: '/analysis', icon: BarChart3 },
  { key: 'assertions', label: 'Assertions', path: '/assertions', icon: ShieldCheck },
];

export const RequirementsWorkspace: React.FC<RequirementsWorkspaceProps> = ({ projectId }) => {
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId || routeProjectId || '1';

  const subPath = location.pathname.replace(projectModuleRootPath(activeProjectId, 'requirements'), '');
  const activeSub = subPath === '' || subPath === '/' ? '' : subPath;

  return (
    <div className='flex h-full min-h-0 flex-row bg-background'>
      <aside className='w-[300px] shrink-0 p-4' aria-label='Requirements navigation'>
        <div className='flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-xl'>
          <div className='flex items-center gap-2 border-b border-border pb-4'>
            <ClipboardList className='h-5 w-5 text-primary' aria-hidden />
            <div>
              <h2 className='text-base font-semibold text-text'>Requirement Explorer</h2>
              <p className='mt-1 text-xs text-text-secondary'>Project quality workspace</p>
            </div>
          </div>
          <nav className='mt-4 space-y-2'>
          {SUB_NAV_ITEMS.map((item) => {
            const fullPath = projectModulePath(activeProjectId, 'requirements', item.path);
            const isActive = activeSub === item.path || (item.path === '' && (activeSub === '' || activeSub === '/'));
            const Icon = item.icon;
            return (
              <NavLink
                key={`side-${item.key}`}
                to={fullPath}
                className={() =>
                  `flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                      : 'border-transparent text-text-secondary hover:border-border hover:bg-background hover:text-text'
                  }`
                }
              >
                <Icon className='h-4 w-4 shrink-0' aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
          </nav>
          <div className='mt-auto border-t border-border px-1 pt-4 text-xs leading-5 text-text-secondary'>
            Select a section to manage requirements and test design.
          </div>
        </div>
      </aside>
      <main className='min-w-0 flex-1 overflow-y-auto'>
      <div className='h-full min-w-0'>
        <Routes key={location.pathname}>
          <Route path='/' element={<RequirementsPage section='requirements' />} />
          <Route path='approved' element={<RequirementsPage section='approved' />} />
          <Route path='archived' element={<RequirementsPage section='archived' />} />
          <Route path='analysis' element={<AnalysisPage />} />
          <Route path='assertions' element={<AssertionLibraryPage />} />
          <Route path='*' element={<RequirementsPage section='requirements' />} />
        </Routes>
      </div>
      </main>
    </div>
  );
};

export default RequirementsWorkspace;
