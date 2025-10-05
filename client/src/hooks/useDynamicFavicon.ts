/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-27
 * PURPOSE: React hook for dynamic favicon generation. Generates a unique 2x2 grid
 * favicon with random colors in a random shape on every component mount/page load.
 * Provides clean integration with React lifecycle and proper error handling.
 * SRP/DRY check: Pass - Single responsibility of managing favicon state in React
 * shadcn/ui: Pass - This is a React hook, UI components not applicable
 */

import { useEffect, useState } from 'react';
import { applyDynamicFavicon, generateDynamicFavicon } from '@/utils/generateFavicon';

interface UseDynamicFaviconReturn {
  /** Whether the favicon has been successfully generated and applied */
  isGenerated: boolean;
  /** Any error that occurred during favicon generation */
  error: string | null;
  /** Manually regenerate the favicon */
  regenerateFavicon: () => void;
}

/**
 * Custom React hook that generates and applies a dynamic favicon on mount
 *
 * Features:
 * - Automatically generates favicon when component mounts
 * - Provides loading state and error handling
 * - Allows manual regeneration
 * - Each page load/tab gets a unique favicon
 *
 * @param autoGenerate - Whether to automatically generate favicon on mount (default: true)
 * @returns Object with generation state and control functions
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isGenerated, error } = useDynamicFavicon();
 *
 *   if (error) {
 *     console.warn('Favicon generation failed:', error);
 *   }
 *
 *   return <div>App content...</div>;
 * }
 * ```
 */
export function useDynamicFavicon(autoGenerate: boolean = true): UseDynamicFaviconReturn {
  const [isGenerated, setIsGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate and apply the dynamic favicon
   */
  const generateFavicon = () => {
    try {
      setError(null);
      setIsGenerated(false);

      applyDynamicFavicon();

      setIsGenerated(true);

      // Log for development visibility
      if (process.env.NODE_ENV === 'development') {
        console.log('🎨 Dynamic favicon generated - unique for this tab!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsGenerated(false);

      console.error('Failed to generate dynamic favicon:', err);
    }
  };

  /**
   * Manual regeneration function for user-triggered updates
   */
  const regenerateFavicon = () => {
    generateFavicon();
  };

  // Auto-generate on mount if enabled
  useEffect(() => {
    if (autoGenerate) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        generateFavicon();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [autoGenerate]);

  return {
    isGenerated,
    error,
    regenerateFavicon,
  };
}

/**
 * Simplified hook that just applies the favicon without state management
 * Use this if you don't need loading states or error handling
 *
 * @example
 * ```tsx
 * function App() {
 *   useSimpleDynamicFavicon(); // Just generates favicon, no return value
 *   return <div>App content...</div>;
 * }
 * ```
 */
export function useSimpleDynamicFavicon(): void {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        applyDynamicFavicon();
      } catch (error) {
        console.error('Dynamic favicon generation failed:', error);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);
}