/**
 *
 * Author: gpt-5-codex
 * Date: October 17, 2025 at 18:55 UTC
 * PURPOSE: Debate session state manager with persisted turn hydration, duplicate-safe streaming reconciliation,
 *          resume helpers, and jury metadata support so the debate UI, exports, and history drawer stay in sync.
 * SRP/DRY check: Pass - Centralizes debate-session stateful logic without duplicating export/history handling elsewhere.
 */

import { useMemo, useRef, useState } from 'react';

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
  cost?: number | {
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
  addMessage: (message: DebateMessage) => void;
  hydrateFromSession: (session: DebateSessionHydration, modelLookup: Map<string, { name: string; provider?: string }>) => void;
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
  const timestampValue = typeof turn.createdAt === 'number'
    ? turn.createdAt
    : turn.createdAt
      ? new Date(turn.createdAt).getTime()
      : Date.now();

  const tokenUsage = turn.tokenUsage
    ? {
        input: turn.tokenUsage.input ?? 0,
        output: turn.tokenUsage.output ?? 0,
        ...(turn.tokenUsage.reasoning ? { reasoning: turn.tokenUsage.reasoning } : {}),
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
    responseId: turn.responseId,
    responseTime: turn.durationMs ?? 0,
    tokenUsage,
    cost: costTotal !== undefined
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

export function useDebateSession(): DebateSessionState {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [turnHistory, setTurnHistory] = useState<DebateTurnHistoryEntry[]>([]);
  const [jurySummary, setJurySummary] = useState<DebateTurnJuryAnnotation | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<DebateSessionMetadata>(INITIAL_METADATA);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [modelALastResponseId, setModelALastResponseId] = useState<string | null>(null);
  const [modelBLastResponseId, setModelBLastResponseId] = useState<string | null>(null);
  const [debateSessionId, setDebateSessionId] = useState<string | null>(null);
  const [existingDebateSessions, setExistingDebateSessions] = useState<DebateSessionSummary[]>([]);

  const responseRegistryRef = useRef(new Set<string>());

  const upsertTurnHistory = (entry: DebateTurnHistoryEntry) => {
    const normalizedEntry = normalizeTurn(entry);

    setTurnHistory(prev => {
      const next = [...prev];
      let index = -1;

      if (normalizedEntry.responseId) {
        index = next.findIndex(turn => turn.responseId === normalizedEntry.responseId);
      }

      if (index === -1) {
        index = next.findIndex(turn => turn.turn === normalizedEntry.turn && turn.modelId === normalizedEntry.modelId);
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

    if (sessionMetadata.model1Id && normalizedEntry.modelId === sessionMetadata.model1Id && normalizedEntry.responseId) {
      setModelALastResponseId(normalizedEntry.responseId);
    }

    if (sessionMetadata.model2Id && normalizedEntry.modelId === sessionMetadata.model2Id && normalizedEntry.responseId) {
      setModelBLastResponseId(normalizedEntry.responseId);
    }

    setCurrentRound(prev => Math.max(prev, normalizedEntry.turn));
  };

  const addMessage = (message: DebateMessage) => {
    setMessages(prev => {
      const index = message.responseId
        ? prev.findIndex(item => item.responseId === message.responseId)
        : prev.findIndex(item => item.turnNumber === message.turnNumber && item.modelId === message.modelId);

      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], ...message };
        return sortMessages(next);
      }

      return sortMessages([...prev, message]);
    });

    upsertTurnHistory({
      turn: message.turnNumber,
      modelId: message.modelId,
      modelName: message.modelName,
      content: message.content,
      reasoning: message.reasoning,
      responseId: message.responseId,
      tokenUsage: message.tokenUsage,
      cost: message.cost
        ? {
            input: message.cost.input,
            output: message.cost.output,
            total: message.cost.total,
            reasoning: message.cost.reasoning,
          }
        : undefined,
      durationMs: message.responseTime,
      createdAt: message.timestamp,
    });
  };

  const hydrateFromSession = (
    session: DebateSessionHydration,
    modelLookup: Map<string, { name: string; provider?: string }>
  ) => {
    setSessionMetadata({
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

    setTurnHistory(normalizedTurns.sort((a, b) => a.turn - b.turn));

    setMessages(() => {
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

    const finalModelAResponseId = session.model1ResponseIds?.at(-1) ?? null;
    const finalModelBResponseId = session.model2ResponseIds?.at(-1) ?? null;

    setModelALastResponseId(finalModelAResponseId);
    setModelBLastResponseId(finalModelBResponseId);

    if (session.jurySummary) {
      setJurySummary(session.jurySummary);
    }

    const highestTurn = normalizedTurns.reduce((max, turn) => Math.max(max, turn.turn), 0);
    setCurrentRound(highestTurn);
    setIsRunning(false);
  };

  const updateJurySummary = (summary: DebateTurnJuryAnnotation | null) => {
    setJurySummary(summary);
  };

  const findLastResponseId = (modelId: string): string | null => {
    for (let index = turnHistory.length - 1; index >= 0; index -= 1) {
      const turn = turnHistory[index];
      if (turn.modelId === modelId && turn.responseId) {
        return turn.responseId;
      }
    }
    return null;
  };

  const getResumeContext = (params: { model1Id: string; model2Id: string }): DebateResumeContext => {
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
  };

  const resetSession = () => {
    setMessages([]);
    setTurnHistory([]);
    setJurySummary(null);
    setSessionMetadata(INITIAL_METADATA);
    setCurrentRound(0);
    setIsRunning(false);
    setModelALastResponseId(null);
    setModelBLastResponseId(null);
    setDebateSessionId(null);
    responseRegistryRef.current.clear();
  };

  const calculateTotalCost = () => {
    if (turnHistory.length === 0) {
      return messages.reduce((sum, msg) => sum + (msg.cost?.total ?? 0), 0);
    }

    return turnHistory.reduce((sum, turn) => {
      if (typeof turn.cost === 'number') {
        return sum + (isNaN(turn.cost) ? 0 : turn.cost);
      }

      const total = turn.cost?.total ?? 0;
      return sum + (isNaN(total) ? 0 : total);
    }, 0);
  };

  const memoizedState: DebateSessionState = useMemo(() => ({
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
    addMessage,
    hydrateFromSession,
    updateJurySummary,
    getResumeContext,
    resetSession,
    calculateTotalCost,
  }), [
    messages,
    turnHistory,
    jurySummary,
    sessionMetadata,
    currentRound,
    isRunning,
    modelALastResponseId,
    modelBLastResponseId,
    debateSessionId,
    existingDebateSessions,
  ]);

  return memoizedState;
}
