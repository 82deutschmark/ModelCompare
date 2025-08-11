/**
 * Authentication Hook
 * 
 * Provides user authentication state and user data management
 * using TanStack Query for efficient caching and synchronization.
 * 
 * Author: Replit Agent
 * Date: August 11, 2025
 */

import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (TanStack Query v5 uses gcTime instead of cacheTime)
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}