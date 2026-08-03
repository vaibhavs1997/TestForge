// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Components
import { SchedulerPage } from './pages';

export const SchedulerRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<SchedulerPage />} />
    </Routes>
  );
};

export default SchedulerRoutes;