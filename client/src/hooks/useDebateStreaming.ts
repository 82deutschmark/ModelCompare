/**
 * Custom hook for managing debate streaming state
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Manages streaming-related state and integrates with useAdvancedStreaming hook
 * SRP/DRY check: Pass - Single responsibility for debate streaming state management
 */

import { useAdvancedStreaming, type StreamingOptions } from '@/hooks/useAdvancedStreaming';

export interface DebateStreamingState {
  // Streaming state from useAdvancedStreaming
  reasoning: string;
  content: string;
  isStreaming: boolean;
  error: string | null;
  responseId: string | null;
  tokenUsage: any;
  cost: any;
  progress: number;
  estimatedCost: number;

  // Streaming control functions
  startStream: (options: StreamingOptions) => Promise<void>;
  cancelStream: () => void;
  pauseStream: () => void;
  resumeStream: () => void;

  // Helper functions
  resetStreaming: () => void;
}

export function useDebateStreaming(): DebateStreamingState {
  const {
    reasoning,
    content,
    isStreaming,
    error,
    responseId,
    tokenUsage,
    cost,
    progress,
    estimatedCost,
    startStream,
    cancelStream,
    pauseStream,
    resumeStream
  } = useAdvancedStreaming();

  // Helper function to reset streaming state
  const resetStreaming = () => {
    // The useAdvancedStreaming hook handles its own state reset
    // This is mainly for any additional streaming-related state we might add
  };

  return {
    // Streaming state
    reasoning,
    content,
    isStreaming,
    error,
    responseId,
    tokenUsage,
    cost,
    progress,
    estimatedCost,

    // Streaming control functions
    startStream,
    cancelStream,
    pauseStream,
    resumeStream,

    // Helper functions
    resetStreaming,
  };
}
