import { PropsWithChildren, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/use-auth';
import { ToastProvider } from '@/components/ui/toast';

// Create a custom render function that includes global providers
export function setupTestClient() {
  // Create a fresh QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return {
    queryClient,
    user: userEvent.setup(),
  };
}

// Custom render with all the necessary providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const { queryClient, user } = setupTestClient();
  
  function Wrapper({ children }: PropsWithChildren<{}>): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  return {
    user,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';