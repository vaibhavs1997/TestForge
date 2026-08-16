import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { ProjectRoutes } from '../modules/project';
import { SettingsRoutes } from '../modules/settings';
import { LandingPage } from '../modules/landing';
import { projectStore } from '../store/projectStore';
import { RequireAuth } from '../modules/auth/components/RequireAuth';
import { GuestOnly } from '../modules/auth/components/GuestOnly';
import { EnterpriseAuthRoutes } from '../modules/auth/components/EnterpriseAuthRoutes';
import { AuthModalRedirect } from '../modules/auth/components/AuthModalRedirect';
import { appPaths, legacyProjectModuleRedirects, projectModulePath, type ProjectModule } from './paths';
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
const ProjectModuleRedirect: React.FC<{ module: ProjectModule }> = ({ module }) => {
  const selectedProjectId = projectStore((state) => state.selectedProjectId);
  const target = selectedProjectId ? projectModulePath(selectedProjectId, module) : appPaths.projects;
  return <Navigate to={target} replace />;
};

export const AppRoutes = () => (
  <Routes>
    <Route path={appPaths.root} element={<LandingPage />} />
    <Route element={<GuestOnly />}>
      <Route element={<EnterpriseAuthRoutes />}>
        <Route path={appPaths.login} element={<AuthModalRedirect mode="login" />} />
        <Route path={appPaths.register} element={<AuthModalRedirect mode="register" />} />
      </Route>
    </Route>
    <Route element={<RequireAuth />}>
      <Route element={<AppShell />}>
        <Route
          path={appPaths.dashboard}
          element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route path={`${appPaths.projects}/*`} element={<ProjectRoutes />} />
        <Route
          path={appPaths.importCenter}
          element={
            <Suspense fallback={<PageLoader />}>
              <ImportCenterPage />
            </Suspense>
          }
        />
        <Route path={appPaths.settings} element={<SettingsRoutes />} />
        <Route
          path={appPaths.showcase}
          element={
            <Suspense fallback={<PageLoader />}>
              <ShowcasePage />
            </Suspense>
          }
        />

      {/*
        Backward-compatible top-level module routes.
        These redirect into the active project workspace so existing URLs
        continue to work while keeping a single source of truth for each module.
      */}
        {legacyProjectModuleRedirects.map(({ path, module }) => (
          <React.Fragment key={path}>
            <Route path={path} element={<ProjectModuleRedirect module={module} />} />
            <Route path={`${path}/*`} element={<ProjectModuleRedirect module={module} />} />
          </React.Fragment>
        ))}
      </Route>
    </Route>
  </Routes>
);

export default AppRoutes;
