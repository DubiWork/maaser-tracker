/**
 * React Query Configuration
 *
 * Configures the QueryClient with appropriate defaults for the app
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (5 minutes)
      staleTime: 1000 * 60 * 5,
      // How long inactive data stays in cache (10 minutes)
      gcTime: 1000 * 60 * 10,
      // Retry failed queries up to 3 times
      retry: 3,
      // Delay between retries (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for data freshness
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect for offline-first behavior
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});
