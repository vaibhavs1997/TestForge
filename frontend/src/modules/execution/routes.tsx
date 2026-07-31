// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { ExecutionPage } from './pages';

// Styles

export const ExecutionRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ExecutionPage />} />
    </Routes>
  );
};

export default ExecutionRoutes;