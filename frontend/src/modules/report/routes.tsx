// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { ReportPage } from './pages';

// Styles

export const ReportRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ReportPage />} />
    </Routes>
  );
};

export default ReportRoutes;