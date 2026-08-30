// External libraries
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// Styles

export const AppShell: React.FC = () => {
  const location = useLocation();

  return (
    <div className="light-app-shell flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main key={location.pathname} className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
