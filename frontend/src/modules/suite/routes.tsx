// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { SuitePage } from './pages';

// Styles

export const SuiteRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<SuitePage />} />
    </Routes>
  );
};

export default SuiteRoutes;
