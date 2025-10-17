/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 18:14 UTC
 * PURPOSE: Stream debate responses via SSE using ref-backed buffers to avoid stale closures, throttle React
 *          renders, and maintain accurate OpenAI Responses API metadata propagation to the debate UI.
 * SRP/DRY check: Pass - Hook continues to coordinate debate streaming state only; buffering helpers prevent
 *                duplication while keeping provider logic server-side.
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
  sessionId?: string;
  model1Id?: string;
  model2Id?: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  reasoningSummary?: 'auto' | 'detailed' | 'concise';
  textVerbosity?: 'low' | 'medium' | 'high';
  temperature?: number;
  maxTokens?: number;
}

export interface StreamChunkBase {
  timestamp: number;
  delta: string;
  cumulativeText: string;
  charCount: number;
  intensity: number;
}

export interface ReasoningStreamChunk extends StreamChunkBase {
  type: 'reasoning';
}

export interface ContentStreamChunk extends StreamChunkBase {
  type: 'content';
}

export interface JsonStreamChunk {
  type: 'json';
  timestamp: number;
  payload: unknown;
}

interface StreamingState {
  reasoning: string;
  content: string;
  reasoningChunks: ReasoningStreamChunk[];
  contentChunks: ContentStreamChunk[];
  jsonChunks: JsonStreamChunk[];
  isStreaming: boolean;
  error: string | null;
  responseId: string | null;
  tokenUsage: any | null;
  cost: any | null;
  progress: number;
  estimatedCost: number;
  statusPhase: string | null;
  statusMessage: string | null;
  session: StreamingSessionInfo | null;
}

interface StreamingSessionInfo {
  sessionId: string;
  taskId: string;
  modelKey: string;
  debateSessionId?: string;
  expiresAt?: string;
}

const createInitialState = (): StreamingState => ({
  reasoning: '',
  content: '',
  reasoningChunks: [],
  contentChunks: [],
  jsonChunks: [],
  isStreaming: false,
  error: null,
  responseId: null,
  tokenUsage: null,
  cost: null,
  progress: 0,
  estimatedCost: 0,
  statusPhase: null,
  statusMessage: null,
  session: null
});

const parseEventData = (raw: unknown): unknown => {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return raw;
};

const isRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object';

const calculateIntensity = (delta: string, timestamp: number, previousTimestamp: number | null): number => {
  const sanitizedDelta = delta.replace(/\s+/g, ' ').trim();
  const charCount = sanitizedDelta.length || delta.length;
  const now = timestamp || Date.now();
  const timeDeltaMs = previousTimestamp ? Math.max(now - previousTimestamp, 1) : 1;
  const perSecond = charCount / (timeDeltaMs / 1000);
  return Number.isFinite(perSecond) ? parseFloat(perSecond.toFixed(3)) : 0;
};

export function useAdvancedStreaming() {
  const [state, setState] = useState<StreamingState>(() => createInitialState());
  const stateRef = useRef<StreamingState>(state);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionInfoRef = useRef<StreamingSessionInfo | null>(null);

  const reasoningBufferRef = useRef<string>('');
  const contentBufferRef = useRef<string>('');
  const reasoningChunksRef = useRef<ReasoningStreamChunk[]>([]);
  const contentChunksRef = useRef<ContentStreamChunk[]>([]);
  const jsonChunksRef = useRef<JsonStreamChunk[]>([]);
  const progressRef = useRef<number>(0);
  const estimatedCostRef = useRef<number>(0);

  const flushPendingRef = useRef<boolean>(false);
  const flushCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Ensure pending network resources and scheduled flushes are cleared on unmount.
  useEffect(() => {
    return () => {
      flushCancelRef.current?.();
      flushCancelRef.current = null;
      flushPendingRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      sessionInfoRef.current = null;
    };
  }, []);

  const setStateWithProducer = useCallback((producer: (prev: StreamingState) => StreamingState | null) => {
    setState(prev => {
      const result = producer(prev);
      if (result === null) {
        return prev;
      }
      stateRef.current = result;
      return result;
    });
  }, []);

  const patchState = useCallback((partial: Partial<StreamingState>) => {
    if (!partial || Object.keys(partial).length === 0) {
      return;
    }

    setStateWithProducer(prev => {
      let changed = false;
      const next: StreamingState = { ...prev };

      for (const key of Object.keys(partial) as (keyof StreamingState)[]) {
        const value = partial[key];
        if (value === undefined) {
          continue;
        }
        if (next[key] !== value) {
          next[key] = value;
          changed = true;
        }
      }

      return changed ? next : null;
    });
  }, [setStateWithProducer]);

  const resetState = useCallback((next: StreamingState) => {
    flushCancelRef.current?.();
    flushCancelRef.current = null;
    flushPendingRef.current = false;

    reasoningBufferRef.current = next.reasoning;
    contentBufferRef.current = next.content;
    reasoningChunksRef.current = next.reasoningChunks;
    contentChunksRef.current = next.contentChunks;
    jsonChunksRef.current = next.jsonChunks;
    progressRef.current = next.progress;
    estimatedCostRef.current = next.estimatedCost;
    sessionInfoRef.current = next.session;

    stateRef.current = next;
    setState(next);
  }, []);

  const commitBuffers = useCallback(() => {
    flushPendingRef.current = false;
    flushCancelRef.current = null;

    const nextReasoning = reasoningBufferRef.current;
    const nextContent = contentBufferRef.current;
    const nextReasoningChunks = reasoningChunksRef.current;
    const nextContentChunks = contentChunksRef.current;
    const nextJsonChunks = jsonChunksRef.current;
    const nextProgress = progressRef.current;
    const nextEstimatedCost = estimatedCostRef.current;

    setStateWithProducer(prev => {
      if (
        prev.reasoning === nextReasoning &&
        prev.content === nextContent &&
        prev.reasoningChunks === nextReasoningChunks &&
        prev.contentChunks === nextContentChunks &&
        prev.jsonChunks === nextJsonChunks &&
        prev.progress === nextProgress &&
        prev.estimatedCost === nextEstimatedCost
      ) {
        return null;
      }

      return {
        ...prev,
        reasoning: nextReasoning,
        content: nextContent,
        reasoningChunks: nextReasoningChunks,
        contentChunks: nextContentChunks,
        jsonChunks: nextJsonChunks,
        progress: nextProgress,
        estimatedCost: nextEstimatedCost
      };
    });
  }, [setStateWithProducer]);

  const flushImmediately = useCallback(() => {
    if (flushCancelRef.current) {
      flushCancelRef.current();
      flushCancelRef.current = null;
    }
    commitBuffers();
  }, [commitBuffers]);

  const scheduleFlush = useCallback(() => {
    if (flushPendingRef.current) {
      return;
    }
    flushPendingRef.current = true;

    const runFlush = () => {
      commitBuffers();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const frameId = window.requestAnimationFrame(runFlush);
      flushCancelRef.current = () => {
        if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(frameId);
        }
        flushPendingRef.current = false;
        flushCancelRef.current = null;
      };
    } else {
      const timeoutId: ReturnType<typeof setTimeout> = setTimeout(runFlush, 16);
      flushCancelRef.current = () => {
        clearTimeout(timeoutId);
        flushPendingRef.current = false;
        flushCancelRef.current = null;
      };
    }
  }, [commitBuffers]);

  const startStream = useCallback(async (options: StreamingOptions) => {
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    flushCancelRef.current?.();
    flushCancelRef.current = null;
    flushPendingRef.current = false;

    reasoningBufferRef.current = '';
    contentBufferRef.current = '';
    reasoningChunksRef.current = [];
    contentChunksRef.current = [];
    progressRef.current = 0;
    estimatedCostRef.current = 0;

    const initialState = {
      ...createInitialState(),
      isStreaming: true
    };
    resetState(initialState);

    abortControllerRef.current = new AbortController();

    try {
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

      const handleParsedEvent = (parsed: ParsedSseEvent) => {
        const { event, data } = parsed;

        if (event === 'stream.chunk' && isRecord(data)) {
          const delta = typeof data.delta === 'string' ? data.delta : '';
          if (!delta) {
            return;
          }

          const chunkType = data.type;
          const timestamp = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
          if (chunkType === 'reasoning') {
            reasoningBufferRef.current += delta;
            const previousChunk = reasoningChunksRef.current[reasoningChunksRef.current.length - 1] ?? null;
            const chunk: ReasoningStreamChunk = {
              type: 'reasoning',
              timestamp,
              delta,
              cumulativeText: reasoningBufferRef.current,
              charCount: delta.length,
              intensity: calculateIntensity(delta, timestamp, previousChunk?.timestamp ?? null)
            };
            reasoningChunksRef.current = [...reasoningChunksRef.current, chunk];
            progressRef.current = Math.min(progressRef.current + 4, 85);
          } else if (chunkType === 'text') {
            contentBufferRef.current += delta;
            const previousChunk = contentChunksRef.current[contentChunksRef.current.length - 1] ?? null;
            const chunk: ContentStreamChunk = {
              type: 'content',
              timestamp,
              delta,
              cumulativeText: contentBufferRef.current,
              charCount: delta.length,
              intensity: calculateIntensity(delta, timestamp, previousChunk?.timestamp ?? null)
            };
            contentChunksRef.current = [...contentChunksRef.current, chunk];
            progressRef.current = Math.min(progressRef.current + 6, 98);
          }
          scheduleFlush();
          return;
        }

        if (event === 'stream.progress' && isRecord(data)) {
          if (typeof data.percentage === 'number' && Number.isFinite(data.percentage)) {
            progressRef.current = Math.min(Math.max(data.percentage, progressRef.current), 100);
          }
          if (typeof data.estimatedCost === 'number' && Number.isFinite(data.estimatedCost)) {
            estimatedCostRef.current = data.estimatedCost;
          }
          scheduleFlush();
          return;
        }

        if (event === 'stream.complete' && isRecord(data)) {
          progressRef.current = 100;
          if (isRecord(data.cost) && typeof data.cost.total === 'number') {
            estimatedCostRef.current = data.cost.total;
          }
          flushImmediately();
          patchState({
            isStreaming: false,
            responseId: typeof data.responseId === 'string' ? data.responseId : null,
            tokenUsage: data.tokenUsage ?? null,
            cost: data.cost ?? null,
            reasoning: reasoningBufferRef.current,
            content: contentBufferRef.current,
            reasoningChunks: reasoningChunksRef.current,
            contentChunks: contentChunksRef.current,
            error: null
          });
          isActive = false;
          return;
        }

        if ((event === 'stream.error' || event === 'error') && isRecord(data)) {
          const errorMessage = typeof data.error === 'string' ? data.error : 'Stream error occurred';
          progressRef.current = 0;
          flushImmediately();
          patchState({
            isStreaming: false,
            error: errorMessage,
            progress: 0
          });
          isActive = false;
          return;
        }

        if (event === 'stream.init') {
          progressRef.current = Math.max(progressRef.current, 1);
          scheduleFlush();
          return;
        }

        if (event === 'stream.keepalive') {
          return;
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
          const parsed = parseSseEvent(rawEvent);
          if (parsed) {
            handleParsedEvent(parsed);
          }
          boundary = buffer.indexOf('\n\n');
        }
      }

      if (buffer.trim().length > 0) {
        const parsed = parseSseEvent(buffer);
        if (parsed) {
          handleParsedEvent(parsed);
        }
      }

      flushImmediately();

      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
        } catch {
          // ignore cancel errors
        }
        readerRef.current = null;
      }

      if (isActive) {
        patchState({ isStreaming: false });
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }

      if (readerRef.current) {
        readerRef.current.cancel().catch(() => undefined);
        readerRef.current = null;
      }

      progressRef.current = 0;
      flushImmediately();
      patchState({
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to start stream',
        progress: 0
      });
    } finally {
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  }, [patchState, resetState, scheduleFlush, flushImmediately]);

  const cancelStream = useCallback(() => {
    flushCancelRef.current?.();
    flushCancelRef.current = null;
    flushPendingRef.current = false;

    if (readerRef.current) {
      readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    progressRef.current = 0;
    flushImmediately();
    patchState({
      isStreaming: false,
      progress: 0
    });
  }, [flushImmediately, patchState]);

  const pauseStream = useCallback(() => {
    console.log('Pause functionality not yet implemented');
  }, []);

  const resumeStream = useCallback(() => {
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
