// External libraries
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared constants
import { QUERY_STALE_TIME_MS, DEFAULT_QUERY_RETRY_COUNT } from '../constants/timeouts';

// Components
import { AppRoutes } from '../routes';
import { AuthBootstrap } from '../components/auth/AuthBootstrap';
import { authStore } from '../store/authStore';
import { setUnauthorizedHandler } from '../services/authSession';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      retry: DEFAULT_QUERY_RETRY_COUNT,
      refetchOnWindowFocus: false,
    },
  },
});

function UserScopedQueryCache() {
  const userId = authStore((state) => state.user?.id ?? null);
  const previousUserId = React.useRef(userId);

  React.useEffect(() => {
    if (previousUserId.current !== userId) {
      queryClient.clear();
      previousUserId.current = userId;
    }
  }, [userId]);

  return null;
}

export const App: React.FC = () => {
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      const { isHydrated, user, loginRequired, manualLogoutUntil } = authStore.getState();
      if (!isHydrated || Date.now() < manualLogoutUntil) {
        return;
      }
      if (user) authStore.getState().logout();
      // A protected API can be reached before RequireAuth finishes resolving
      // the session. Always recover an unauthenticated 401 through login.
      if (loginRequired || !user) window.location.assign('/?auth=login&expired=1');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserScopedQueryCache />
      <BrowserRouter>
        <AuthBootstrap>
          <AppRoutes />
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
