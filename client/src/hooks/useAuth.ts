/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-14
 * PURPOSE: Authentication hook that connects to existing backend auth system.
 * Provides authentication state, user data, and auth actions for components.
 * Integrates with existing Google OAuth backend in server/auth.ts and API routes.
 * SRP/DRY check: Pass - Single responsibility (auth state management)
 * shadcn/ui: Pass - No UI components, pure logic hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getDeviceId } from '@/lib/deviceId';
import type { User } from '@shared/schema';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isOAuthUser: boolean; // true only for Google OAuth users (email !== null)
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

export function useAuth(): AuthState & AuthActions {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch current user from backend
  const { data: user, isLoading, error: queryError } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/user', {
          headers: {
            'x-device-id': getDeviceId(),
          },
          credentials: 'include',
        });

        if (response.status === 401) {
          // Not authenticated, return null
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }

        const userData = await response.json();
        return userData as User;
      } catch (err) {
        console.error('Auth fetch error:', err);
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear all queries and redirect
      queryClient.clear();
      window.location.href = '/';

      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out of your account.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Google OAuth login - redirects to backend endpoint
  const login = useCallback(() => {
    window.location.href = '/api/auth/google';
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Refresh user data
  const refreshUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['auth-user'] });
  }, [queryClient]);

  // Handle query errors
  useEffect(() => {
    if (queryError && queryError.message) {
      setError(queryError.message);
    } else {
      setError(null);
    }
  }, [queryError]);

  return {
    // State
    user: user || null,
    isAuthenticated: !!user,
    isOAuthUser: !!(user?.email), // Distinguish OAuth users from device users
    isLoading,
    error,

    // Actions
    login,
    logout,
    refreshUser,
  };
}

// Create a provider component for auth context if needed
export default useAuth;