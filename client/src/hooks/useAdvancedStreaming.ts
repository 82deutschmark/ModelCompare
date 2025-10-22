/*
 * Author: gpt-5-codex
 * Date: 2025-10-22 01:16 UTC
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
  intensityLevel: number;
  intensityGuidance: string;
  intensityHeading?: string;
  intensityLabel?: string;
  intensitySummary?: string;
  intensityFullText?: string;
  opponentMessage: string | null;
  previousResponseId: string | null;
  turnNumber: number;
  sessionId?: string;
  model1Id?: string;
  model2Id?: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  reasoningSummary?: 'auto' | 'detailed' | 'concise';
  reasoningVerbosity?: 'low' | 'medium' | 'high';
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

export interface StreamingSessionInfo {
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
  const streamEndedRef = useRef<boolean>(false);

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
      const mutableNext = next as Record<keyof StreamingState, StreamingState[keyof StreamingState]>;

      for (const key of Object.keys(partial) as Array<keyof StreamingState>) {
        const value = partial[key];
        if (value === undefined) {
          continue;
        }
        if (mutableNext[key] !== value) {
          mutableNext[key] = value as StreamingState[keyof StreamingState];
          changed = true;
        }
      }

      return changed ? next : null;
    });
  }, [setStateWithProducer]);

  const closeEventSource = useCallback((clearSession = false) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (clearSession) {
      sessionInfoRef.current = null;
    }
  }, []);

  const appendJsonPayload = useCallback((payload: unknown, timestamp?: number) => {
    if (payload === undefined) {
      return;
    }
    const resolvedTimestamp =
      typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : Date.now();
    const chunk: JsonStreamChunk = {
      type: 'json',
      timestamp: resolvedTimestamp,
      payload
    };
    jsonChunksRef.current = [...jsonChunksRef.current, chunk];
  }, []);

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
    streamEndedRef.current = false;
    closeEventSource(true);

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
    jsonChunksRef.current = [];
    progressRef.current = 0;
    estimatedCostRef.current = 0;

    const initialState: StreamingState = {
      ...createInitialState(),
      isStreaming: true,
      statusPhase: 'handshake',
      statusMessage: 'Initializing debate stream',
      session: null
    };
    resetState(initialState);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const requestPayload: Record<string, unknown> = { ...options };
      if (!('reasoningVerbosity' in requestPayload) && 'textVerbosity' in requestPayload) {
        requestPayload.reasoningVerbosity = requestPayload.textVerbosity;
        delete requestPayload.textVerbosity;
      }
      if (!requestPayload.sessionId) {
        delete requestPayload.sessionId;
      }

      const initResponse = await fetch('/api/debate/stream/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      let initPayload: any = null;
      try {
        initPayload = await initResponse.json();
      } catch {
        initPayload = null;
      }

      if (!initResponse.ok) {
        const message =
          (initPayload && typeof initPayload.error === 'string') ? initPayload.error :
          `Failed to initialize stream (${initResponse.status})`;
        throw new Error(message);
      }

      if (!initPayload || typeof initPayload !== 'object') {
        throw new Error('Streaming session response was malformed');
      }

      const { sessionId, taskId, modelKey, debateSessionId, expiresAt } = initPayload as Record<string, unknown>;
      if (typeof sessionId !== 'string' || typeof taskId !== 'string' || typeof modelKey !== 'string') {
        throw new Error('Streaming session response missing identifiers');
      }

      abortControllerRef.current = null;

      const sessionInfo: StreamingSessionInfo = {
        sessionId,
        taskId,
        modelKey,
        debateSessionId: typeof debateSessionId === 'string' ? debateSessionId : undefined,
        expiresAt: typeof expiresAt === 'string' ? expiresAt : undefined
      };
      sessionInfoRef.current = sessionInfo;
      patchState({
        session: sessionInfo,
        statusPhase: 'connecting',
        statusMessage: 'Opening event stream'
      });

      const encodedTaskId = encodeURIComponent(taskId);
      const encodedModelKey = encodeURIComponent(modelKey);
      const encodedSessionId = encodeURIComponent(sessionId);
      const streamUrl = `/api/debate/stream/${encodedTaskId}/${encodedModelKey}/${encodedSessionId}`;

      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        throw new Error('EventSource streaming is not supported in this environment');
      }

      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      const handleChunk = (event: MessageEvent) => {
        const data = parseEventData(event.data);
        if (!isRecord(data)) {
          return;
        }

        const timestampRaw = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
        const timestamp = Number.isFinite(timestampRaw) ? timestampRaw : Date.now();
        const chunkType = data.type;

        if (chunkType === 'reasoning') {
          const delta = typeof data.delta === 'string' ? data.delta : '';
          if (!delta) {
            return;
          }
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
          if (stateRef.current.statusPhase !== 'streaming') {
            patchState({ statusPhase: 'streaming', statusMessage: null });
          }
          scheduleFlush();
          return;
        }

        if (chunkType === 'text') {
          const delta = typeof data.delta === 'string' ? data.delta : '';
          if (!delta) {
            return;
          }
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
          if (stateRef.current.statusPhase !== 'streaming') {
            patchState({ statusPhase: 'streaming', statusMessage: null });
          }
          scheduleFlush();
          return;
        }

        if (chunkType === 'json') {
          const payload = Object.prototype.hasOwnProperty.call(data, 'delta') ? (data as any).delta : data;
          appendJsonPayload(payload, timestamp);
          if (stateRef.current.statusPhase !== 'streaming') {
            patchState({ statusPhase: 'streaming', statusMessage: null });
          }
          scheduleFlush();
        }
      };

      const handleStatus = (event: MessageEvent) => {
        const data = parseEventData(event.data);
        if (!isRecord(data)) {
          return;
        }
        const phase = typeof data.phase === 'string'
          ? data.phase
          : typeof data.status === 'string'
          ? data.status
          : stateRef.current.statusPhase;
        const message = typeof data.message === 'string' ? data.message : null;
        const partial: Partial<StreamingState> = {};
        if (phase) {
          partial.statusPhase = phase;
        }
        partial.statusMessage = message;
        patchState(partial);
        if (typeof data.percentage === 'number' && Number.isFinite(data.percentage)) {
          progressRef.current = Math.min(Math.max(data.percentage, progressRef.current), 100);
        }
        if (typeof data.estimatedCost === 'number' && Number.isFinite(data.estimatedCost)) {
          estimatedCostRef.current = data.estimatedCost;
        }
        scheduleFlush();
      };

      const handleInit = (event: MessageEvent) => {
        const data = parseEventData(event.data);
        if (isRecord(data) && typeof data.connectedAt === 'string') {
          patchState({
            statusPhase: 'connected',
            statusMessage: 'Stream connected'
          });
        } else {
          patchState({
            statusPhase: 'connected',
            statusMessage: null
          });
        }
        progressRef.current = Math.max(progressRef.current, 1);
        scheduleFlush();
      };

      const handleProgress = (event: MessageEvent) => {
        const data = parseEventData(event.data);
        if (!isRecord(data)) {
          return;
        }
        if (typeof data.percentage === 'number' && Number.isFinite(data.percentage)) {
          progressRef.current = Math.min(Math.max(data.percentage, progressRef.current), 100);
        }
        if (typeof data.estimatedCost === 'number' && Number.isFinite(data.estimatedCost)) {
          estimatedCostRef.current = data.estimatedCost;
        }
        scheduleFlush();
      };

      const handleComplete = (event: MessageEvent) => {
        const data = parseEventData(event.data);
        if (!isRecord(data)) {
          return;
        }
        streamEndedRef.current = true;
        closeEventSource();

        if (typeof data.reasoning === 'string') {
          reasoningBufferRef.current = data.reasoning;
        }
        if (typeof data.content === 'string') {
          contentBufferRef.current = data.content;
        }
        if (Array.isArray((data as any).json)) {
          const baseTimestamp = Date.now();
          for (const [index, entry] of ((data as any).json as unknown[]).entries()) {
            appendJsonPayload(entry, baseTimestamp + index);
          }
        } else if (Object.prototype.hasOwnProperty.call(data, 'json')) {
          appendJsonPayload((data as any).json, Date.now());
        }

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
          jsonChunks: jsonChunksRef.current,
          error: null,
          statusPhase: 'completed',
          statusMessage: typeof data.message === 'string' ? data.message : 'Stream completed'
        });
      };

      const handleStreamErrorEvent = (event: MessageEvent) => {
        const data = parseEventData(event.data);
        streamEndedRef.current = true;
        closeEventSource(true);

        let errorMessage = 'Stream error occurred';
        if (isRecord(data) && typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }

        progressRef.current = 0;
        flushImmediately();
        patchState({
          isStreaming: false,
          error: errorMessage,
          progress: 0,
          statusPhase: 'error',
          statusMessage: errorMessage,
          session: null
        });
      };

      const handleError = (event: Event) => {
        if (streamEndedRef.current) {
          closeEventSource(true);
          return;
        }
        streamEndedRef.current = true;
        closeEventSource(true);
        progressRef.current = 0;
        flushImmediately();
        patchState({
          isStreaming: false,
          error: 'Streaming connection lost',
          progress: 0,
          statusPhase: 'error',
          statusMessage: 'Streaming connection lost',
          session: null
        });
      };

      eventSource.addEventListener('stream.chunk', handleChunk as EventListener);
      eventSource.addEventListener('stream.status', handleStatus as EventListener);
      eventSource.addEventListener('stream.init', handleInit as EventListener);
      eventSource.addEventListener('stream.progress', handleProgress as EventListener);
      eventSource.addEventListener('stream.complete', handleComplete as EventListener);
      eventSource.addEventListener('stream.error', handleStreamErrorEvent as EventListener);
      eventSource.onerror = handleError;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }

      abortControllerRef.current = null;
      progressRef.current = 0;
      flushImmediately();
      patchState({
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to start stream',
        progress: 0,
        statusPhase: 'error',
        statusMessage: error instanceof Error ? error.message : 'Failed to start stream',
        session: null
      });
      closeEventSource(true);
    }
  }, [appendJsonPayload, closeEventSource, flushImmediately, patchState, resetState, scheduleFlush, stateRef]);

  const cancelStream = useCallback(() => {
    flushCancelRef.current?.();
    flushCancelRef.current = null;
    flushPendingRef.current = false;

    streamEndedRef.current = true;
    closeEventSource(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    progressRef.current = 0;
    estimatedCostRef.current = 0;
    flushImmediately();
    patchState({
      isStreaming: false,
      progress: 0,
      statusPhase: 'cancelled',
      statusMessage: 'Stream cancelled',
      session: null
    });
  }, [closeEventSource, flushImmediately, patchState]);

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
