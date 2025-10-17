/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 18:52 UTC
 * PURPOSE: Wrap debate streaming hook to expose structured chunk arrays alongside legacy fields for replay UIs.
 * SRP/DRY check: Pass - Delegates streaming mechanics to useAdvancedStreaming while reshaping consumer-facing state.
 */

import {
  useAdvancedStreaming,
  type StreamingOptions,
  type ReasoningStreamChunk,
  type ContentStreamChunk,
  type JsonStreamChunk,
  type StreamingSessionInfo
} from '@/hooks/useAdvancedStreaming';

export interface DebateStreamingState {
  // Streaming state from useAdvancedStreaming
  reasoning: string;
  content: string;
  reasoningChunks: ReasoningStreamChunk[];
  contentChunks: ContentStreamChunk[];
  jsonChunks: JsonStreamChunk[];
  isStreaming: boolean;
  error: string | null;
  responseId: string | null;
  tokenUsage: any;
  cost: any;
  progress: number;
  estimatedCost: number;
  statusPhase: string | null;
  statusMessage: string | null;
  session: StreamingSessionInfo | null;

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
    reasoningChunks,
    contentChunks,
    jsonChunks,
    isStreaming,
    error,
    responseId,
    tokenUsage,
    cost,
    progress,
    estimatedCost,
    statusPhase,
    statusMessage,
    session,
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
    reasoningChunks,
    contentChunks,
    jsonChunks,
    isStreaming,
    error,
    responseId,
    tokenUsage,
    cost,
    progress,
    estimatedCost,
    statusPhase,
    statusMessage,
    session,

    // Streaming control functions
    startStream,
    cancelStream,
    pauseStream,
    resumeStream,

    // Helper functions
    resetStreaming,
  };
}
