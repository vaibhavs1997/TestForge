import React from 'react';
import { Outlet } from 'react-router-dom';
import { EnterpriseAuthGate } from './EnterpriseAuthGate';

export const EnterpriseAuthRoutes: React.FC = () => (
  <EnterpriseAuthGate>
    <Outlet />
  </EnterpriseAuthGate>
);

export default EnterpriseAuthRoutes;
