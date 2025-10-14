import { useState, useCallback, useRef } from 'react';

interface DebateStreamOptions {
  modelId: string;
  topic: string;
  role: 'AFFIRMATIVE' | 'NEGATIVE';
  intensity: number;
  opponentMessage: string | null;
  previousResponseId: string | null;
  turnNumber: number;
}

interface StreamState {
  reasoning: string;
  content: string;
  isStreaming: boolean;
  error: string | null;
  responseId: string | null;
  tokenUsage: any | null;
  cost: any | null;
}

export function useDebateStream() {
  const [state, setState] = useState<StreamState>({
    reasoning: '',
    content: '',
    isStreaming: false,
    error: null,
    responseId: null,
    tokenUsage: null,
    cost: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(async (options: DebateStreamOptions) => {
    // Reset state
    setState({
      reasoning: '',
      content: '',
      isStreaming: true,
      error: null,
      responseId: null,
      tokenUsage: null,
      cost: null
    });

    try {
      // Make POST request to initiate stream
      const response = await fetch('/api/debate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Read SSE stream
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: reasoning')) {
            const data = JSON.parse(line.replace('event: reasoning\ndata: ', ''));
            setState(prev => ({
              ...prev,
              reasoning: prev.reasoning + data.chunk
            }));
          } else if (line.startsWith('event: content')) {
            const data = JSON.parse(line.replace('event: content\ndata: ', ''));
            setState(prev => ({
              ...prev,
              content: prev.content + data.chunk
            }));
          } else if (line.startsWith('event: complete')) {
            const data = JSON.parse(line.replace('event: complete\ndata: ', ''));
            setState(prev => ({
              ...prev,
              isStreaming: false,
              responseId: data.responseId,
              tokenUsage: data.tokenUsage,
              cost: data.cost
            }));
          } else if (line.startsWith('event: error')) {
            const data = JSON.parse(line.replace('event: error\ndata: ', ''));
            setState(prev => ({
              ...prev,
              isStreaming: false,
              error: data.message
            }));
          }
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    startStream,
    cancelStream
  };
}
