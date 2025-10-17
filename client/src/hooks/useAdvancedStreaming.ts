/*
 * Author: gpt-5-codex
 * Date: 2025-10-17 15:26 UTC
 * PURPOSE: Refactors debate streaming hook to consume the server-sent events stream
 *          directly from the /api/debate/stream POST endpoint while preserving
 *          progress tracking, cancellation, and abort controller coordination.
 * SRP/DRY check: Pass - Hook remains responsible for orchestrating debate
 *                streaming state without duplicating server logic.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export interface StreamingOptions {
  modelId: string;
  topic: string;
  role: 'AFFIRMATIVE' | 'NEGATIVE';
  intensity: number;
  opponentMessage: string | null;
  previousResponseId: string | null;
  turnNumber: number;
  sessionId?: string; // For debate session management
  model1Id?: string;  // For debate session creation
  model2Id?: string;  // For debate session creation

  // Advanced configuration
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  reasoningSummary?: 'auto' | 'detailed' | 'concise';
  textVerbosity?: 'low' | 'medium' | 'high';
  temperature?: number;
  maxTokens?: number;
}

interface StreamingState {
  reasoning: string;
  content: string;
  isStreaming: boolean;
  error: string | null;
  responseId: string | null;
  tokenUsage: any | null;
  cost: any | null;
  progress: number;
  estimatedCost: number;
}

export function useAdvancedStreaming() {
  const [state, setState] = useState<StreamingState>({
    reasoning: '',
    content: '',
    isStreaming: false,
    error: null,
    responseId: null,
    tokenUsage: null,
    cost: null,
    progress: 0,
    estimatedCost: 0
  });

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => undefined);
        readerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const startStream = useCallback(async (options: StreamingOptions) => {
    // Cancel any existing stream
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setState({
      reasoning: '',
      content: '',
      isStreaming: true,
      error: null,
      responseId: null,
      tokenUsage: null,
      cost: null,
      progress: 0,
      estimatedCost: 0
    });

    try {
      // Create AbortController for the streaming request
      abortControllerRef.current = new AbortController();

      // Directly initiate the streaming session
      const response = await fetch('/api/debate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize stream: ${response.statusText}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Readable stream not available');
      }

      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let isActive = true;

      const closeReader = async () => {
        if (readerRef.current) {
          try {
            await readerRef.current.cancel();
          } catch {
            // ignore cancellation errors
          }
          readerRef.current = null;
        }
      };

      const processEvent = (rawEvent: string) => {
        const lines = rawEvent.split('\n');
        let eventType = 'message';
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (dataLines.length === 0) {
          return;
        }

        const dataStr = dataLines.join('\n');
        let parsedData: any;

        try {
          parsedData = JSON.parse(dataStr);
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError);
          return;
        }

        if (eventType === 'stream.chunk') {
          if (parsedData.type === 'reasoning') {
            setState(prev => ({
              ...prev,
              reasoning: prev.reasoning + (parsedData.delta ?? ''),
              progress: Math.min(prev.progress + 5, 80)
            }));
          } else if (parsedData.type === 'text') {
            setState(prev => ({
              ...prev,
              content: prev.content + (parsedData.delta ?? ''),
              progress: Math.min(prev.progress + 10, 95)
            }));
          }
        } else if (eventType === 'stream.progress') {
          setState(prev => ({
            ...prev,
            progress: parsedData.percentage ?? prev.progress,
            estimatedCost: parsedData.estimatedCost ?? prev.estimatedCost
          }));
        } else if (eventType === 'stream.complete') {
          setState(prev => ({
            ...prev,
            isStreaming: false,
            responseId: parsedData.responseId ?? null,
            tokenUsage: parsedData.tokenUsage ?? null,
            cost: parsedData.cost ?? null,
            progress: 100
          }));
          isActive = false;
        } else if (eventType === 'stream.error' || eventType === 'error') {
          setState(prev => ({
            ...prev,
            isStreaming: false,
            error: parsedData.error || 'Stream error occurred',
            progress: 0
          }));
          isActive = false;
        }
      };

      while (isActive) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          processEvent(rawEvent);
          boundary = buffer.indexOf('\n\n');
        }
      }

      // Flush any remaining buffered text
      if (buffer.trim().length > 0) {
        processEvent(buffer);
        buffer = '';
      }

      await closeReader();
      if (isActive) {
        setState(prev => ({
          ...prev,
          isStreaming: false
        }));
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled');
        return;
      }

      if (readerRef.current) {
        readerRef.current.cancel().catch(() => undefined);
        readerRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message || 'Failed to start stream',
        progress: 0
      }));
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isStreaming: false,
      progress: 0
    }));
  }, []);

  const pauseStream = useCallback(() => {
    // For future implementation - pause/resume functionality
    console.log('Pause functionality not yet implemented');
  }, []);

  const resumeStream = useCallback(() => {
    // For future implementation - pause/resume functionality
    console.log('Resume functionality not yet implemented');
  }, []);

  return {
    ...state,
    startStream,
    cancelStream,
    pauseStream,
    resumeStream
  };
}
