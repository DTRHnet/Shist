import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

// Check if we're in local development mode
const isLocalDev = !import.meta.env.VITE_REPL_ID || import.meta.env.VITE_LOCAL_DEV === 'true';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Auto-login mutation for local development
  const autoLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/auto-login');
      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache with the logged-in user
      queryClient.setQueryData(["/api/auth/user"], data.user);
    },
  });

  // Auto-login effect for local development
  useEffect(() => {
    if (isLocalDev && !isLoading && !user && !autoLoginMutation.isPending) {
      autoLoginMutation.mutate();
    }
  }, [isLocalDev, isLoading, user, autoLoginMutation]);

  return {
    user,
    isLoading: isLoading || autoLoginMutation.isPending,
    isAuthenticated: !!user,
  };
}
