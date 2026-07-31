// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { EnvironmentPage } from './pages';

// Styles

export const EnvironmentRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<EnvironmentPage />} />
    </Routes>
  );
};

export default EnvironmentRoutes;