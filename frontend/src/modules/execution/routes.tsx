// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { ExecutionPage } from './pages';
import { ExecutionProfilePage } from './pages/ExecutionProfilePage';

// Styles

export const ExecutionRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ExecutionPage />} />
      <Route path='profiles' element={<ExecutionProfilePage />} />
    </Routes>
  );
};

export default ExecutionRoutes;