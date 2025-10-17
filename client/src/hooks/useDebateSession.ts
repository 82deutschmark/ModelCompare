// * Author: GPT-5 Codex
// * Date: 2025-10-17 19:47 UTC
// * PURPOSE: Consolidated debate session state manager cleaning merge duplicates, preserving turn history, jury workflow, and resume helpers for streaming debate mode.
// * SRP/DRY check: Pass - Single hook orchestrates debate session state while delegating UI/rendering elsewhere; no duplicate implementations remain.

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ContentStreamChunk, ReasoningStreamChunk } from '@/hooks/useAdvancedStreaming';

export type DebatePhase = 'OPENING_STATEMENTS' | 'REBUTTALS' | 'CLOSING_ARGUMENTS';

export const ROBERTS_RULES_PHASES: readonly DebatePhase[] = [
  'OPENING_STATEMENTS',
  'REBUTTALS',
  'CLOSING_ARGUMENTS',
] as const;

export interface JuryAnnotation {
  modelId: string;
  modelName: string;
  points: number;
  tags: string[];
  notes: string;
  needsReview: boolean;
}

export type JuryAnnotationsMap = Record<string, JuryAnnotation>;

export interface DebateTurnJuryAnnotation {
  verdict?: string;
  summary?: string;
  winnerModelId?: string;
  score?: number;
  confidence?: number;
}

export interface DebateTurnHistoryEntry {
  turn: number;
  modelId: string;
  modelName?: string;
  content: string;
  reasoning?: string;
  responseId?: string | null;
  tokenUsage?: {
    input?: number;
    output?: number;
    reasoning?: number;
  };
  cost?:
    | number
    | {
        input?: number;
        output?: number;
        reasoning?: number;
        total?: number;
      };
  durationMs?: number;
  createdAt?: string | number | Date;
  jury?: DebateTurnJuryAnnotation;
}

export interface DebateSessionSummary {
  id: string;
  topic: string;
  model1Id: string;
  model2Id: string;
  adversarialLevel?: number;
  totalCost?: number;
  createdAt?: string;
  updatedAt?: string;
  durationMs?: number;
  turnCount?: number;
  jury?: DebateTurnJuryAnnotation;
}

export interface DebateSessionHydration {
  id: string;
  topic: string;
  model1Id: string;
  model2Id: string;
  adversarialLevel: number;
  turnHistory: DebateTurnHistoryEntry[];
  model1ResponseIds?: string[];
  model2ResponseIds?: string[];
  totalCost?: number;
  createdAt?: string;
  updatedAt?: string;
  jurySummary?: DebateTurnJuryAnnotation | null;
}

export interface DebateSessionMetadata {
  topic: string | null;
  model1Id: string | null;
  model2Id: string | null;
  adversarialLevel: number | null;
}

export interface DebateResumeContext {
  nextTurnNumber: number;
  nextModelId: string;
  isModelBTurn: boolean;
  previousResponseId: string | null;
}

export interface DebateMessage {
  id: string;
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
  round: number;
  turnNumber: number;
  reasoning?: string;
  systemPrompt?: string;
  responseId?: string | null;
  responseTime: number;
  reasoningChunks?: ReasoningStreamChunk[];
  contentChunks?: ContentStreamChunk[];
  tokenUsage?: {
    input: number;
    output: number;
    reasoning?: number;
  };
  cost?: {
    input: number;
    output: number;
    reasoning?: number;
    total: number;
  };
  modelConfig?: {
    capabilities: {
      reasoning: boolean;
      multimodal: boolean;
      functionCalling: boolean;
      streaming: boolean;
    };
    pricing: {
      inputPerMillion: number;
      outputPerMillion: number;
      reasoningPerMillion?: number;
    };
  };
}

export interface DebateSessionState {
  messages: DebateMessage[];
  turnHistory: DebateTurnHistoryEntry[];
  jurySummary: DebateTurnJuryAnnotation | null;
  sessionMetadata: DebateSessionMetadata;
  setSessionMetadata: (metadata: DebateSessionMetadata) => void;
  setMessages: (messages: DebateMessage[]) => void;
  currentRound: number;
  setCurrentRound: (round: number) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  modelALastResponseId: string | null;
  setModelALastResponseId: (id: string | null) => void;
  modelBLastResponseId: string | null;
  setModelBLastResponseId: (id: string | null) => void;
  debateSessionId: string | null;
  setDebateSessionId: (id: string | null) => void;
  existingDebateSessions: DebateSessionSummary[];
  setExistingDebateSessions: (sessions: DebateSessionSummary[]) => void;

  // Phase tracking
  phaseIndex: number;
  advancePhase: () => void;
  reopenPhase: (phase: DebatePhase) => void;
  getCurrentPhase: () => DebatePhase;
  phaseTimestamps: Partial<Record<DebatePhase, number>>;
  floorOpen: boolean;
  toggleFloor: () => void;
  isFloorOpen: () => boolean;

  // Jury annotations
  juryAnnotations: JuryAnnotationsMap;
  initializeJury: (speakers: Array<{ modelId: string; modelName: string }>) => void;
  incrementJuryPoints: (modelId: string) => void;
  decrementJuryPoints: (modelId: string) => void;
  toggleJuryTag: (modelId: string, tag: string) => void;
  setJuryNotes: (modelId: string, notes: string) => void;
  markJuryReviewed: (modelId: string, reviewed?: boolean) => void;
  hasUnresolvedJuryTasks: () => boolean;

  // Helper functions
  addMessage: (message: DebateMessage) => void;
  hydrateFromSession: (
    session: DebateSessionHydration,
    modelLookup: Map<string, { name: string; provider?: string }>
  ) => void;
  updateJurySummary: (summary: DebateTurnJuryAnnotation | null) => void;
  getResumeContext: (params: { model1Id: string; model2Id: string }) => DebateResumeContext;
  resetSession: () => void;
  calculateTotalCost: () => number;
}

const INITIAL_METADATA: DebateSessionMetadata = {
  topic: null,
  model1Id: null,
  model2Id: null,
  adversarialLevel: null,
};

function normalizeTurn(entry: DebateTurnHistoryEntry): DebateTurnHistoryEntry {
  return {
    ...entry,
    responseId: entry.responseId ?? null,
    turn: entry.turn,
  };
}

function buildMessageFromTurn(turn: DebateTurnHistoryEntry, fallbackName: string): DebateMessage {
  const timestampValue =
    typeof turn.createdAt === 'number'
      ? turn.createdAt
      : turn.createdAt
        ? new Date(turn.createdAt).getTime()
        : Date.now();

  const tokenUsage = turn.tokenUsage
    ? {
        input: turn.tokenUsage.input ?? 0,
        output: turn.tokenUsage.output ?? 0,
        ...(turn.tokenUsage.reasoning !== undefined ? { reasoning: turn.tokenUsage.reasoning } : {}),
      }
    : undefined;

  let costTotal: number | undefined;
  let costInput = 0;
  let costOutput = 0;
  let costReasoning: number | undefined;

  if (typeof turn.cost === 'number') {
    costTotal = turn.cost;
  } else if (turn.cost) {
    costTotal = turn.cost.total ?? 0;
    costInput = turn.cost.input ?? 0;
    costOutput = turn.cost.output ?? 0;
    costReasoning = turn.cost.reasoning;
  }

  const turnIdentifier = turn.responseId
    ? `turn-${turn.turn}-${turn.responseId}`
    : `turn-${turn.turn}-${turn.modelId}`;

  return {
    id: turnIdentifier,
    modelId: turn.modelId,
    modelName: turn.modelName ?? fallbackName,
    content: turn.content,
    timestamp: timestampValue,
    round: Math.max(1, Math.ceil(turn.turn / 2)),
    turnNumber: turn.turn,
    reasoning: turn.reasoning,
    responseId: turn.responseId ?? null,
    responseTime: turn.durationMs ?? 0,
    tokenUsage,
    cost:
      costTotal !== undefined
        ? {
            input: costInput,
            output: costOutput,
            total: costTotal,
            ...(costReasoning !== undefined ? { reasoning: costReasoning } : {}),
          }
        : undefined,
  };
}

function sortMessages(messages: DebateMessage[]): DebateMessage[] {
  return [...messages].sort((a, b) => a.turnNumber - b.turnNumber);
}

function cloneMessage(message: DebateMessage): DebateMessage {
  return {
    ...message,
    reasoningChunks: message.reasoningChunks?.map(chunk => ({ ...chunk })),
    contentChunks: message.contentChunks?.map(chunk => ({ ...chunk })),
  };
}

export function useDebateSession(): DebateSessionState {
  const [messagesState, setMessagesState] = useState<DebateMessage[]>([]);
  const [turnHistory, setTurnHistory] = useState<DebateTurnHistoryEntry[]>([]);
  const [jurySummary, setJurySummary] = useState<DebateTurnJuryAnnotation | null>(null);
  const [sessionMetadataState, setSessionMetadataState] =
    useState<DebateSessionMetadata>(INITIAL_METADATA);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [modelALastResponseId, setModelALastResponseId] = useState<string | null>(null);
  const [modelBLastResponseId, setModelBLastResponseId] = useState<string | null>(null);
  const [debateSessionId, setDebateSessionId] = useState<string | null>(null);
  const [existingDebateSessionsState, setExistingDebateSessionsState] = useState<DebateSessionSummary[]>([]);

  const responseRegistryRef = useRef(new Set<string>());

  // Phase tracking
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTimestamps, setPhaseTimestamps] = useState<Partial<Record<DebatePhase, number>>>(() => ({
    [ROBERTS_RULES_PHASES[0]]: Date.now(),
  }));
  const [floorOpen, setFloorOpen] = useState(true);

  // Jury annotations
  const [juryAnnotations, setJuryAnnotations] = useState<JuryAnnotationsMap>({});

  const messages = messagesState;
  const sessionMetadata = sessionMetadataState;
  const existingDebateSessions = existingDebateSessionsState;

  const setSessionMetadata = useCallback((metadata: DebateSessionMetadata) => {
    setSessionMetadataState(metadata);
  }, []);

  const setMessages = useCallback((messagesInput: DebateMessage[]) => {
    setMessagesState(sortMessages(messagesInput.map(cloneMessage)));
  }, []);

  const setExistingDebateSessions = useCallback((sessions: DebateSessionSummary[]) => {
    setExistingDebateSessionsState(sessions);
  }, []);

  const getCurrentPhase = useCallback((): DebatePhase => {
    return ROBERTS_RULES_PHASES[Math.min(phaseIndex, ROBERTS_RULES_PHASES.length - 1)];
  }, [phaseIndex]);

  const isFloorOpen = useCallback((): boolean => floorOpen, [floorOpen]);

  const ensureAnnotation = useCallback((modelId: string, modelName: string): JuryAnnotation => {
    return {
      modelId,
      modelName,
      points: 0,
      tags: [],
      notes: '',
      needsReview: false,
    };
  }, []);

  const advancePhase = useCallback(() => {
    setPhaseIndex(prev => {
      if (prev >= ROBERTS_RULES_PHASES.length - 1) {
        return prev;
      }
      const nextIndex = prev + 1;
      const nextPhase = ROBERTS_RULES_PHASES[nextIndex];
      setPhaseTimestamps(prevTimestamps => ({
        ...prevTimestamps,
        [nextPhase]: Date.now(),
      }));
      setFloorOpen(nextPhase !== 'CLOSING_ARGUMENTS');
      return nextIndex;
    });
  }, []);

  const reopenPhase = useCallback((phase: DebatePhase) => {
    const index = ROBERTS_RULES_PHASES.indexOf(phase);
    if (index === -1) return;
    setPhaseIndex(index);
    setPhaseTimestamps(prevTimestamps => ({
      ...prevTimestamps,
      [phase]: prevTimestamps[phase] ?? Date.now(),
    }));
    setFloorOpen(phase !== 'CLOSING_ARGUMENTS');
  }, []);

  const toggleFloor = useCallback(() => {
    setFloorOpen(prev => !prev);
  }, []);

  const initializeJury = useCallback(
    (speakers: Array<{ modelId: string; modelName: string }>) => {
      setJuryAnnotations(prev => {
        const next: JuryAnnotationsMap = { ...prev };
        let changed = false;

        speakers.forEach(({ modelId, modelName }) => {
          const existing = next[modelId];
          if (existing) {
            if (existing.modelName !== modelName) {
              next[modelId] = { ...existing, modelName };
              changed = true;
            }
          } else {
            next[modelId] = ensureAnnotation(modelId, modelName);
            changed = true;
          }
        });

        const activeIds = new Set(speakers.map(s => s.modelId));
        Object.keys(next).forEach(modelId => {
          if (!activeIds.has(modelId)) {
            delete next[modelId];
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    },
    [ensureAnnotation]
  );

  const adjustPoints = useCallback((modelId: string, delta: number) => {
    setJuryAnnotations(prev => {
      const current = prev[modelId];
      if (!current) {
        return prev;
      }
      const nextPoints = Math.max(0, current.points + delta);
      return {
        ...prev,
        [modelId]: {
          ...current,
          points: nextPoints,
        },
      };
    });
  }, []);

  const incrementJuryPoints = useCallback((modelId: string) => adjustPoints(modelId, 1), [adjustPoints]);
  const decrementJuryPoints = useCallback((modelId: string) => adjustPoints(modelId, -1), [adjustPoints]);

  const toggleJuryTag = useCallback((modelId: string, tag: string) => {
    setJuryAnnotations(prev => {
      const current = prev[modelId];
      if (!current) {
        return prev;
      }
      const hasTag = current.tags.includes(tag);
      return {
        ...prev,
        [modelId]: {
          ...current,
          tags: hasTag ? current.tags.filter(t => t !== tag) : [...current.tags, tag],
          needsReview: true,
        },
      };
    });
  }, []);

  const setJuryNotes = useCallback((modelId: string, notes: string) => {
    setJuryAnnotations(prev => {
      const current = prev[modelId];
      if (!current) {
        return prev;
      }
      if (current.notes === notes) {
        return prev;
      }
      return {
        ...prev,
        [modelId]: {
          ...current,
          notes,
          needsReview: true,
        },
      };
    });
  }, []);

  const markJuryReviewed = useCallback((modelId: string, reviewed = true) => {
    setJuryAnnotations(prev => {
      const current = prev[modelId];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [modelId]: {
          ...current,
          needsReview: !reviewed,
        },
      };
    });
  }, []);

  const hasUnresolvedJuryTasks = useCallback((): boolean => {
    return Object.values(juryAnnotations).some(annotation => annotation.needsReview);
  }, [juryAnnotations]);

  const upsertTurnHistory = useCallback(
    (entry: DebateTurnHistoryEntry) => {
      const normalizedEntry = normalizeTurn(entry);

      setTurnHistory(prev => {
        const next = [...prev];
        let index = -1;

        if (normalizedEntry.responseId) {
          index = next.findIndex(turn => turn.responseId === normalizedEntry.responseId);
        }

        if (index === -1) {
          index = next.findIndex(
            turn => turn.turn === normalizedEntry.turn && turn.modelId === normalizedEntry.modelId
          );
        }

        if (index >= 0) {
          next[index] = { ...next[index], ...normalizedEntry };
        } else {
          next.push(normalizedEntry);
        }

        next.sort((a, b) => a.turn - b.turn);
        return next;
      });

      if (normalizedEntry.responseId) {
        responseRegistryRef.current.add(normalizedEntry.responseId);
      }

      if (
        sessionMetadata.model1Id &&
        normalizedEntry.modelId === sessionMetadata.model1Id &&
        normalizedEntry.responseId
      ) {
        setModelALastResponseId(normalizedEntry.responseId);
      }

      if (
        sessionMetadata.model2Id &&
        normalizedEntry.modelId === sessionMetadata.model2Id &&
        normalizedEntry.responseId
      ) {
        setModelBLastResponseId(normalizedEntry.responseId);
      }

      setCurrentRound(prev => Math.max(prev, normalizedEntry.turn));
    },
    [sessionMetadata.model1Id, sessionMetadata.model2Id]
  );

  const addMessage = useCallback(
    (message: DebateMessage) => {
      const normalizedMessage = cloneMessage(message);

      setMessagesState(prev => {
        const next = [...prev];
        const index = normalizedMessage.responseId
          ? next.findIndex(item => item.responseId === normalizedMessage.responseId)
          : next.findIndex(
              item => item.turnNumber === normalizedMessage.turnNumber && item.modelId === normalizedMessage.modelId
            );

        if (index >= 0) {
          next[index] = { ...next[index], ...normalizedMessage };
        } else {
          next.push(normalizedMessage);
        }

        return sortMessages(next);
      });

      setJuryAnnotations(prev => {
        const existing = prev[normalizedMessage.modelId];
        if (!existing) {
          return prev;
        }
        return {
          ...prev,
          [normalizedMessage.modelId]: {
            ...existing,
            needsReview: true,
          },
        };
      });

      upsertTurnHistory({
        turn: normalizedMessage.turnNumber,
        modelId: normalizedMessage.modelId,
        modelName: normalizedMessage.modelName,
        content: normalizedMessage.content,
        reasoning: normalizedMessage.reasoning,
        responseId: normalizedMessage.responseId ?? null,
        tokenUsage: normalizedMessage.tokenUsage,
        cost: normalizedMessage.cost
          ? {
              input: normalizedMessage.cost.input,
              output: normalizedMessage.cost.output,
              reasoning: normalizedMessage.cost.reasoning,
              total: normalizedMessage.cost.total,
            }
          : undefined,
        durationMs: normalizedMessage.responseTime,
        createdAt: normalizedMessage.timestamp,
      });
    },
    [upsertTurnHistory]
  );

  const hydrateFromSession = useCallback(
    (
      session: DebateSessionHydration,
      modelLookup: Map<string, { name: string; provider?: string }>
    ) => {
      setSessionMetadataState({
        topic: session.topic,
        model1Id: session.model1Id,
        model2Id: session.model2Id,
        adversarialLevel: session.adversarialLevel,
      });

      setDebateSessionId(session.id);
      responseRegistryRef.current.clear();

      const normalizedTurns = session.turnHistory.map(turn => {
        const modelName = modelLookup.get(turn.modelId)?.name ?? turn.modelName ?? turn.modelId;
        return normalizeTurn({ ...turn, modelName });
      });

      normalizedTurns.forEach(turn => {
        if (turn.responseId) {
          responseRegistryRef.current.add(turn.responseId);
        }
      });

      normalizedTurns.sort((a, b) => a.turn - b.turn);
      setTurnHistory(normalizedTurns);

      setMessagesState(() => {
        const mapped = normalizedTurns.map(turn => {
          const fallbackName = modelLookup.get(turn.modelId)?.name ?? turn.modelName ?? 'Model';
          const message = buildMessageFromTurn(turn, fallbackName);
          const capabilities = turn.reasoning
            ? { reasoning: true, multimodal: false, functionCalling: false, streaming: true }
            : { reasoning: false, multimodal: false, functionCalling: false, streaming: true };

          return {
            ...message,
            modelConfig: {
              capabilities,
              pricing: {
                inputPerMillion: 0,
                outputPerMillion: 0,
              },
            },
          };
        });

        return sortMessages(mapped);
      });

      setModelALastResponseId(session.model1ResponseIds?.at(-1) ?? null);
      setModelBLastResponseId(session.model2ResponseIds?.at(-1) ?? null);

      if (session.jurySummary) {
        setJurySummary(session.jurySummary);
      }

      const highestTurn = normalizedTurns.reduce((max, turn) => Math.max(max, turn.turn), 0);
      setCurrentRound(highestTurn);
      setIsRunning(false);
    },
    []
  );

  const updateJurySummary = useCallback((summary: DebateTurnJuryAnnotation | null) => {
    setJurySummary(summary);
  }, []);

  const findLastResponseId = useCallback(
    (modelId: string): string | null => {
      for (let index = turnHistory.length - 1; index >= 0; index -= 1) {
        const turn = turnHistory[index];
        if (turn.modelId === modelId && turn.responseId) {
          return turn.responseId;
        }
      }
      return null;
    },
    [turnHistory]
  );

  const getResumeContext = useCallback(
    (params: { model1Id: string; model2Id: string }): DebateResumeContext => {
      const { model1Id, model2Id } = params;
      const nextTurnNumber = currentRound + 1;
      const isModelBTurn = currentRound % 2 === 1;
      const nextModelId = isModelBTurn ? model2Id : model1Id;
      const previousResponseId = findLastResponseId(nextModelId);

      return {
        nextTurnNumber,
        nextModelId,
        isModelBTurn,
        previousResponseId,
      };
    },
    [currentRound, findLastResponseId]
  );

  const resetSession = useCallback(() => {
    setMessagesState([]);
    setTurnHistory([]);
    setJurySummary(null);
    setSessionMetadataState(INITIAL_METADATA);
    setCurrentRound(0);
    setIsRunning(false);
    setModelALastResponseId(null);
    setModelBLastResponseId(null);
    setDebateSessionId(null);
    setExistingDebateSessionsState([]);
    setPhaseIndex(0);
    setPhaseTimestamps({
      [ROBERTS_RULES_PHASES[0]]: Date.now(),
    });
    setFloorOpen(true);
    setJuryAnnotations({});
    responseRegistryRef.current.clear();
  }, []);

  const calculateTotalCost = useCallback(() => {
    if (turnHistory.length === 0) {
      return messages.reduce((sum, msg) => sum + (msg.cost?.total ?? 0), 0);
    }

    return turnHistory.reduce((sum, turn) => {
      if (typeof turn.cost === 'number') {
        return sum + (Number.isFinite(turn.cost) ? turn.cost : 0);
      }

      const total = turn.cost?.total ?? 0;
      return sum + (Number.isFinite(total) ? total : 0);
    }, 0);
  }, [turnHistory, messages]);

  return useMemo(
    () => ({
      messages,
      turnHistory,
      jurySummary,
      sessionMetadata,
      setSessionMetadata,
      setMessages,
      currentRound,
      setCurrentRound,
      isRunning,
      setIsRunning,
      modelALastResponseId,
      setModelALastResponseId,
      modelBLastResponseId,
      setModelBLastResponseId,
      debateSessionId,
      setDebateSessionId,
      existingDebateSessions,
      setExistingDebateSessions,

      // Phase tracking
      phaseIndex,
      advancePhase,
      reopenPhase,
      getCurrentPhase,
      phaseTimestamps,
      floorOpen,
      toggleFloor,
      isFloorOpen,

      // Jury annotations
      juryAnnotations,
      initializeJury,
      incrementJuryPoints,
      decrementJuryPoints,
      toggleJuryTag,
      setJuryNotes,
      markJuryReviewed,
      hasUnresolvedJuryTasks,

      // Helper functions
      addMessage,
      hydrateFromSession,
      updateJurySummary,
      getResumeContext,
      resetSession,
      calculateTotalCost,
    }),
    [
      messages,
      turnHistory,
      jurySummary,
      sessionMetadata,
      setSessionMetadata,
      setMessages,
      currentRound,
      setCurrentRound,
      isRunning,
      setIsRunning,
      modelALastResponseId,
      setModelALastResponseId,
      modelBLastResponseId,
      setModelBLastResponseId,
      debateSessionId,
      setDebateSessionId,
      existingDebateSessions,
      setExistingDebateSessions,
      phaseIndex,
      advancePhase,
      reopenPhase,
      getCurrentPhase,
      phaseTimestamps,
      floorOpen,
      toggleFloor,
      isFloorOpen,
      juryAnnotations,
      initializeJury,
      incrementJuryPoints,
      decrementJuryPoints,
      toggleJuryTag,
      setJuryNotes,
      markJuryReviewed,
      hasUnresolvedJuryTasks,
      addMessage,
      hydrateFromSession,
      updateJurySummary,
      getResumeContext,
      resetSession,
      calculateTotalCost,
    ]
  );
}
