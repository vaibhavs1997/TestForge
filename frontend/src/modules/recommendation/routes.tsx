// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Hooks

// Services

// Components
import { RecommendationsPage } from './pages/index';

// Styles

export const RecommendationRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<RecommendationsPage />} />
    </Routes>
  );
};

export default RecommendationRoutes;