/**
 * Test Utilities
 *
 * Helper functions for rendering components with all necessary providers
 */

import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../contexts/LanguageProvider';

/**
 * Custom render function that wraps components with all providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {RenderResult}
 */
export function renderWithProviders(ui, options = {}) {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Don't retry in tests
        },
      },
    }),
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from React Testing Library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
export { renderWithProviders as render };
