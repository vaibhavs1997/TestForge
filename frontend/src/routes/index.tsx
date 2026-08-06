import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { ProjectRoutes } from '../modules/project';
import { SettingsRoutes } from '../modules/settings';
import { LandingPage } from '../modules/landing';
import { projectStore } from '../store/projectStore';
// Simple loading fallback for lazy routes
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-lg">Loading...</div>
  </div>
);

// Lazy load pages for route-based code splitting
const DashboardPage = lazy(() => import('../modules/dashboard/pages/DashboardPage'));
const ImportCenterPage = lazy(() => import('../modules/import/pages/ImportCenterPage'));
const ShowcasePage = lazy(() => import('../app/ShowcasePage'));

/**
 * Redirects a top-level module URL (e.g. /apis) into the active project
 * workspace (e.g. /projects/:projectId/apis) so existing URLs keep working.
 */
const ProjectModuleRedirect: React.FC<{ module: string }> = ({ module }) => {
  const selectedProjectId = projectStore((state) => state.selectedProjectId);
  const target = selectedProjectId
    ? `/projects/${selectedProjectId}/${module}`
    : '/projects';
  return <Navigate to={target} replace />;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route element={<AppShell />}>
      <Route path='/dashboard' element={
        <Suspense fallback={<PageLoader />}>
          <DashboardPage />
        </Suspense>
      } />
      <Route path='/projects/*' element={<ProjectRoutes />} />
      <Route path='/import' element={
        <Suspense fallback={<PageLoader />}>
          <ImportCenterPage />
        </Suspense>
      } />
      <Route path='/settings' element={<SettingsRoutes />} />
      <Route path='/showcase' element={
        <Suspense fallback={<PageLoader />}>
          <ShowcasePage />
        </Suspense>
      } />

      {/*
        Backward-compatible top-level module routes.
        These redirect into the active project workspace so existing URLs
        continue to work while keeping a single source of truth for each module.
      */}
      <Route path='/apis' element={<ProjectModuleRedirect module='apis' />} />
      <Route path='/apis/*' element={<ProjectModuleRedirect module='apis' />} />
      <Route path='/environments' element={<ProjectModuleRedirect module='environment' />} />
      <Route path='/environments/*' element={<ProjectModuleRedirect module='environment' />} />
      <Route path='/knowledge' element={<ProjectModuleRedirect module='knowledge' />} />
      <Route path='/knowledge/*' element={<ProjectModuleRedirect module='knowledge' />} />
      <Route path='/reports' element={<ProjectModuleRedirect module='reports' />} />
      <Route path='/reports/*' element={<ProjectModuleRedirect module='reports' />} />
      <Route path='/notifications' element={<ProjectModuleRedirect module='notifications' />} />
      <Route path='/notifications/*' element={<ProjectModuleRedirect module='notifications' />} />
      <Route path='/versions' element={<ProjectModuleRedirect module='versions' />} />
      <Route path='/versions/*' element={<ProjectModuleRedirect module='versions' />} />
      <Route path='/audit' element={<ProjectModuleRedirect module='audit' />} />
      <Route path='/audit/*' element={<ProjectModuleRedirect module='audit' />} />
      <Route path='/plugins' element={<ProjectModuleRedirect module='plugins' />} />
      <Route path='/plugins/*' element={<ProjectModuleRedirect module='plugins' />} />
      <Route path='/ai-providers' element={<ProjectModuleRedirect module='ai-providers' />} />
      <Route path='/ai-providers/*' element={<ProjectModuleRedirect module='ai-providers' />} />
      <Route path='/recommendations' element={<ProjectModuleRedirect module='recommendations' />} />
      <Route path='/recommendations/*' element={<ProjectModuleRedirect module='recommendations' />} />
      <Route path='/pipeline' element={<ProjectModuleRedirect module='pipeline' />} />
      <Route path='/pipeline/*' element={<ProjectModuleRedirect module='pipeline' />} />
      <Route path='/context' element={<ProjectModuleRedirect module='context' />} />
      <Route path='/context/*' element={<ProjectModuleRedirect module='context' />} />
      <Route path='/prompts' element={<ProjectModuleRedirect module='prompts' />} />
      <Route path='/prompts/*' element={<ProjectModuleRedirect module='prompts' />} />
    </Route>
  </Routes>
);

export default AppRoutes;