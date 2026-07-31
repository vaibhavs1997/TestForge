// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { SettingsPage } from './pages';

// Styles

export const SettingsRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<SettingsPage />} />
    </Routes>
  );
};

export default SettingsRoutes;