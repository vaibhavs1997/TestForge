// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Components
import { AuditLogPage } from './pages';

export const AuditRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<AuditLogPage />} />
    </Routes>
  );
};

export default AuditRoutes;