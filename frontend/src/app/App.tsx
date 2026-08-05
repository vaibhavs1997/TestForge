// External libraries
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared constants
import { QUERY_STALE_TIME_MS, DEFAULT_QUERY_RETRY_COUNT } from '../constants/timeouts';

// Shared types

// Hooks

// Services

// Components
import { AppRoutes } from '../routes';

// Styles

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      retry: DEFAULT_QUERY_RETRY_COUNT,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;