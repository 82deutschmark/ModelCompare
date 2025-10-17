// * Author: gpt-5-codex
// * Date: 2025-10-17 19:26 UTC
// * PURPOSE: Extend debate session state with Robert's Rules phase tracking, floor controls, and jury annotations for exports.
// * SRP/DRY check: Pass - Centralized debate session state while exposing focused helpers.
/**
 * Custom hook for managing debate session state
 */

import { useCallback, useState } from 'react';

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

export interface DebateMessage {
  id: string;
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
  round: number;
  reasoning?: string;
  systemPrompt?: string;
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
  // Debate state
  messages: DebateMessage[];
  setMessages: (messages: DebateMessage[]) => void;
  currentRound: number;
  setCurrentRound: (round: number) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;

  // Session tracking
  modelALastResponseId: string | null;
  setModelALastResponseId: (id: string | null) => void;
  modelBLastResponseId: string | null;
  setModelBLastResponseId: (id: string | null) => void;
  debateSessionId: string | null;
  setDebateSessionId: (id: string | null) => void;
  existingDebateSessions: any[];
  setExistingDebateSessions: (sessions: any[]) => void;

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
  resetSession: () => void;
  calculateTotalCost: () => number;
}

export function useDebateSession(): DebateSessionState {
  // Debate state
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Session tracking
  const [modelALastResponseId, setModelALastResponseId] = useState<string | null>(null);
  const [modelBLastResponseId, setModelBLastResponseId] = useState<string | null>(null);
  const [debateSessionId, setDebateSessionId] = useState<string | null>(null);
  const [existingDebateSessions, setExistingDebateSessions] = useState<any[]>([]);

  // Phase tracking
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTimestamps, setPhaseTimestamps] = useState<Partial<Record<DebatePhase, number>>>(() => ({
    [ROBERTS_RULES_PHASES[0]]: Date.now(),
  }));
  const [floorOpen, setFloorOpen] = useState(true);

  // Jury annotations
  const [juryAnnotations, setJuryAnnotations] = useState<JuryAnnotationsMap>({});

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

  const initializeJury = useCallback((speakers: Array<{ modelId: string; modelName: string }>) => {
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
  }, [ensureAnnotation]);

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
      return {
        ...prev,
        [modelId]: {
          ...current,
          notes,
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

  // Helper function to add a single message
  const addMessage = useCallback((message: DebateMessage) => {
    setMessages(prev => [...prev, message]);
    setJuryAnnotations(prev => {
      const existing = prev[message.modelId];
      if (!existing) {
        return prev;
      }
      return {
        ...prev,
        [message.modelId]: {
          ...existing,
          needsReview: true,
        },
      };
    });
  }, []);

  // Reset function for session state
  const resetSession = () => {
    setMessages([]);
    setCurrentRound(0);
    setIsRunning(false);
    setModelALastResponseId(null);
    setModelBLastResponseId(null);
    setDebateSessionId(null);
    setExistingDebateSessions([]);
    setPhaseIndex(0);
    setPhaseTimestamps({
      [ROBERTS_RULES_PHASES[0]]: Date.now(),
    });
    setFloorOpen(true);
    setJuryAnnotations({});
  };

  // Calculate total cost of all messages
  const calculateTotalCost = useCallback(() => {
    return messages.reduce((sum, msg) => sum + (msg.cost?.total || 0), 0);
  }, [messages]);

  return {
    // Debate state
    messages,
    setMessages,
    currentRound,
    setCurrentRound,
    isRunning,
    setIsRunning,

    // Session tracking
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
    resetSession,
    calculateTotalCost,
  };
}
