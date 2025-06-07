import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
        // Global error handler for all query errors
        console.error('Query error:', error);
        toast.error('Data fetching error', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred while fetching data.',
          action: {
            label: 'Retry',
            onClick: () => queryClient.invalidateQueries()
          },
          duration: 10000, // 10 seconds
        });
      },
    },
    mutations: {
      onError: (error, variables, context) => {
        // Global error handler for all mutation errors
        console.error('Mutation error:', error, variables, context);
        toast.error('Operation failed', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred while processing your request.',
          duration: 10000, // 10 seconds
        });
      },
    },
  },
});
