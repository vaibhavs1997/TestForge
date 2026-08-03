// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Components
import { NotificationPage } from './pages';

export const NotificationRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<NotificationPage />} />
    </Routes>
  );
};

export default NotificationRoutes;