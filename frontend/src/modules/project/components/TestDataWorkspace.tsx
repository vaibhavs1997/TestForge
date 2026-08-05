import React from 'react';
import { Routes, Route, NavLink, useLocation, useParams } from 'react-router-dom';
import { TestDataLibraryPage } from '../../test-data/pages/DatasetPage';
import { MappingPage } from '../../test-data/pages/MappingPage';

interface TestDataWorkspaceProps {
  projectId: string;
}

const SUB_NAV_ITEMS = [
  { key: '', label: 'Datasets', path: '' },
  { key: 'rows', label: 'Rows', path: '/rows' },
  { key: 'relationships', label: 'Relationships', path: '/relationships' },
  { key: 'providers', label: 'Providers', path: '/providers' },
  { key: 'generators', label: 'Generators', path: '/generators' },
  { key: 'mapping', label: 'Mappings', path: '/mapping' },
];

export const TestDataWorkspace: React.FC<TestDataWorkspaceProps> = ({ projectId }) => {
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId || routeProjectId || '1';

  // Determine active sub-tab from URL
  const subPath = location.pathname.replace(`/projects/${activeProjectId}/testdata`, '');
  const activeSub = subPath === '' || subPath === '/' ? '' : subPath;

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-1 border-b border-border bg-surface px-6 py-2'>
        {SUB_NAV_ITEMS.map((item) => {
          const fullPath = `/projects/${activeProjectId}/testdata${item.path}`;
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
          {/*
            Datasets, Rows, Relationships, Providers, Generators
            All reuse TestDataLibraryPage which has internal navigation for these sections.
            Rows are accessible via the Data tab inside a dataset's details panel.
            Relationships and Providers have dedicated sections within the library page.
          */}
          <Route path='/' element={<TestDataLibraryPage />} />
          <Route path='rows' element={<TestDataLibraryPage />} />
          <Route path='relationships' element={<TestDataLibraryPage />} />
          <Route path='providers' element={<TestDataLibraryPage />} />
          <Route path='generators' element={<TestDataLibraryPage />} />
          {/* Mappings - standalone mapping page */}
          <Route path='mapping' element={<MappingPage />} />
          {/* Default to datasets */}
          <Route path='*' element={<TestDataLibraryPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default TestDataWorkspace;