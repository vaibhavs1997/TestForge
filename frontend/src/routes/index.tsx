import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { ShowcasePage } from '../app/ShowcasePage';
import { ProjectRoutes } from '../modules/project';
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage';
import { ApiRoutes } from '../modules/api';
import { ImportCenterPage } from '../modules/import/pages/ImportCenterPage';
import { EnvironmentRoutes } from '../modules/environment';
import { KnowledgeRoutes } from '../modules/knowledge';
import { AnalysisRoutes } from '../modules/analysis';
import { RequirementsRoutes } from '../modules/requirements';
import { SuiteRoutes } from '../modules/suite';
import { ExecutionRoutes } from '../modules/execution';
import { ReportRoutes } from '../modules/report';
import { SettingsRoutes } from '../modules/settings';
import { TestDataRoutes } from '../modules/test-data';

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className='flex h-full flex-col items-center justify-center'>
    <h1 className='text-2xl font-bold text-text'>{title}</h1>
    <p className='mt-2 text-text-secondary'>Placeholder for the {title} module.</p>
  </div>
);

export const AppRoutes = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path='/' element={<Navigate to='/projects' replace />} />
      <Route path='/dashboard' element={<DashboardPage />} />
      <Route path='/projects/*' element={<ProjectRoutes />} />
      <Route path='/apis/*' element={<ApiRoutes />} />
      <Route path='/import' element={<ImportCenterPage />} />
      <Route path='/environments/*' element={<EnvironmentRoutes />} />
      <Route path='/knowledge/*' element={<KnowledgeRoutes />} />
      <Route path='/analysis/*' element={<AnalysisRoutes />} />
      <Route path='/requirements/*' element={<RequirementsRoutes />} />
      <Route path='/suites/*' element={<SuiteRoutes />} />
      <Route path='/executions/*' element={<ExecutionRoutes />} />
      <Route path='/reports/*' element={<ReportRoutes />} />
      <Route path='/settings' element={<SettingsRoutes />} />
      <Route path='/test-data/*' element={<TestDataRoutes />} />
      <Route path='/showcase' element={<ShowcasePage />} />
    </Route>
  </Routes>
);

export default AppRoutes;