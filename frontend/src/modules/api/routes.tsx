// External libraries
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { ServiceListPage } from './pages/ServiceListPage';

// Styles

export const ApiRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ServiceListPage projectId='1' projectName='E-Commerce Platform' />} />
      <Route path=':projectId' element={<ServiceListPage />} />
    </Routes>
  );
};

export default ApiRoutes;