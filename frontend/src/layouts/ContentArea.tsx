// External libraries
import React from 'react';
import { Outlet } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles

export const ContentArea: React.FC = () => {
  return (
    <div className="flex-1 p-6">
      <Outlet />
    </div>
  );
};

export default ContentArea;