/**
 * Custom hook for managing debate session state
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Manages debate session state including messages, rounds, response tracking, and session management
 * SRP/DRY check: Pass - Single responsibility for debate session state management
 */

import { useState } from 'react';

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

  // Helper function to add a single message
  const addMessage = (message: DebateMessage) => {
    setMessages(prev => [...prev, message]);
  };

  // Reset function for session state
  const resetSession = () => {
    setMessages([]);
    setCurrentRound(0);
    setIsRunning(false);
    setModelALastResponseId(null);
    setModelBLastResponseId(null);
    setDebateSessionId(null);
    setExistingDebateSessions([]);
  };

  // Calculate total cost of all messages
  const calculateTotalCost = () => {
    return messages.reduce((sum, msg) => sum + (msg.cost?.total || 0), 0);
  };

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

    // Helper functions
    addMessage,
    resetSession,
    calculateTotalCost,
  };
}
