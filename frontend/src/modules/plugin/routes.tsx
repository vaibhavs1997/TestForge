// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Components
import { PluginManagementPage } from './pages';

export const PluginRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<PluginManagementPage />} />
    </Routes>
  );
};

export default PluginRoutes;