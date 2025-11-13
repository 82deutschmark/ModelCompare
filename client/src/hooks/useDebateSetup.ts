/*
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-10-22
 * PURPOSE: Backwards-compatible wrapper around useDebateSetupStore (Zustand).
 *          Converted from useState to Zustand to fix state sharing bug.
 * SRP/DRY check: Pass - Delegates to Zustand store for shared state
 */

import { useDebateSetupStore } from '@/stores/useDebateSetupStore';

export type { DebateSetupState } from '@/stores/useDebateSetupStore';

/**
 * Hook wrapper for useDebateSetupStore - maintains backwards compatibility
 * while using Zustand for shared state across all components
 */
export function useDebateSetup() {
  return useDebateSetupStore();
}
