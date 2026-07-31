// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { RequirementsPage } from './pages/index';

// Styles

export const RequirementsRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<RequirementsPage />} />
    </Routes>
  );
};

export default RequirementsRoutes;