// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Components
import { VersionHistoryPage } from './pages';

export const VersioningRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<VersionHistoryPage />} />
    </Routes>
  );
};

export default VersioningRoutes;