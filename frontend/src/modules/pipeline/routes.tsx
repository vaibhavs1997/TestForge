import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PipelinePage } from './pages/PipelinePage';

export const PipelineRoutes = () => {
  const projectId = 'default-project';
  return (
    <Routes>
      <Route path='/' element={<Navigate to='/pipeline' replace />} />
      <Route path='/pipeline' element={<PipelinePage projectId={projectId} />} />
    </Routes>
  );
};

export default PipelineRoutes;
