// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Components
import { ReportPage } from './pages/ReportPage';
import { ReportDetailsPage } from './pages/ReportDetailsPage';

export const ReportRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ReportPage />} />
      <Route path='/:reportId' element={<ReportDetailsPage />} />
    </Routes>
  );
};

export default ReportRoutes;