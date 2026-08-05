// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Components
import { AnalysisPage } from './pages';

export const AnalysisRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<AnalysisPage />} />
      <Route path=':projectId' element={<AnalysisPage />} />
    </Routes>
  );
};

export default AnalysisRoutes;