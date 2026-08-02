// External libraries
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { TestDataLibraryPage } from './pages/DatasetPage';
import { MappingPage } from './pages/MappingPage';

// Styles

export const TestDataRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<TestDataLibraryPage />} />
      <Route path='mappings' element={<MappingPage />} />
      <Route path=':projectId' element={<TestDataLibraryPage />} />
      <Route path=':projectId/mappings' element={<MappingPage />} />
    </Routes>
  );
};

export default TestDataRoutes;