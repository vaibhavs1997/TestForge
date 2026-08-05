// External libraries
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { KnowledgePage } from './pages';

// Styles

export const KnowledgeRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<KnowledgePage />} />
      <Route path=':projectId' element={<KnowledgePage />} />
    </Routes>
  );
};

export default KnowledgeRoutes;
