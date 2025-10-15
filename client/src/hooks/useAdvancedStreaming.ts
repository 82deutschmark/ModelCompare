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

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startStream = useCallback(async (options: StreamingOptions) => {
    // Cancel any existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
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
      // Create AbortController for the initial request
      abortControllerRef.current = new AbortController();

      // First, make a POST request to initiate the streaming session
      const initResponse = await fetch('/api/debate/stream/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
        signal: abortControllerRef.current.signal
      });

      if (!initResponse.ok) {
        throw new Error(`Failed to initialize stream: ${initResponse.statusText}`);
      }

      const { sessionId } = await initResponse.json();

      // Now create EventSource for the actual streaming
      const eventSource = new EventSource(`/api/debate/stream/${sessionId}`);

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
      };

      eventSource.addEventListener('stream.init', (event) => {
        const data = JSON.parse(event.data);
        console.log('Stream initialized:', data);
      });

      eventSource.addEventListener('stream.chunk', (event) => {
        const chunk = JSON.parse(event.data);

        if (chunk.type === 'reasoning') {
          setState(prev => ({
            ...prev,
            reasoning: prev.reasoning + chunk.delta,
            // Estimate progress based on reasoning completion
            progress: Math.min(prev.progress + 5, 80)
          }));
        } else if (chunk.type === 'text') {
          setState(prev => ({
            ...prev,
            content: prev.content + chunk.delta,
            progress: Math.min(prev.progress + 10, 95)
          }));
        }
      });

      eventSource.addEventListener('stream.progress', (event) => {
        const progressData = JSON.parse(event.data);
        setState(prev => ({
          ...prev,
          progress: progressData.percentage,
          estimatedCost: progressData.estimatedCost || prev.estimatedCost
        }));
      });

      eventSource.addEventListener('stream.complete', (event) => {
        const result = JSON.parse(event.data);

        setState(prev => ({
          ...prev,
          isStreaming: false,
          responseId: result.responseId,
          tokenUsage: result.tokenUsage,
          cost: result.cost,
          progress: 100
        }));

        eventSource.close();
        eventSourceRef.current = null;
      });

      eventSource.addEventListener('stream.error', (event) => {
        const errorData = JSON.parse(event.data);

        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: errorData.error || 'Stream error occurred',
          progress: 0
        }));

        eventSource.close();
        eventSourceRef.current = null;
      });

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);

        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: 'Connection lost - please try again',
          progress: 0
        }));

        eventSource.close();
        eventSourceRef.current = null;
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled');
        return;
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
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
