/**
 * Custom hook for managing debate state
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Centralized state management for debate functionality, providing all state variables and setters in a single object with reset functionality
 * SRP/DRY check: Pass - Single responsibility for debate state management, no duplication with other state management hooks
 */

import { useState } from 'react';
import type { ModelConfiguration } from '@/components/ModelConfigurationPanel';

export interface DebateState {
  // Topic state
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  customTopic: string;
  setCustomTopic: (topic: string) => void;
  useCustomTopic: boolean;
  setUseCustomTopic: (useCustom: boolean) => void;

  // Adversarial level
  adversarialLevel: number;
  setAdversarialLevel: (level: number) => void;

  // Model selection
  model1Id: string;
  setModel1Id: (modelId: string) => void;
  model2Id: string;
  setModel2Id: (modelId: string) => void;

  // Model configurations
  model1Config: ModelConfiguration;
  setModel1Config: (config: ModelConfiguration) => void;
  model2Config: ModelConfiguration;
  setModel2Config: (config: ModelConfiguration) => void;

  // Debate state
  messages: any[];
  setMessages: (messages: any[]) => void;
  currentRound: number;
  setCurrentRound: (round: number) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;

  // UI state
  showSetup: boolean;
  setShowSetup: (show: boolean) => void;
  showSystemPrompts: boolean;
  setShowSystemPrompts: (show: boolean) => void;

  // Session tracking
  modelALastResponseId: string | null;
  setModelALastResponseId: (id: string | null) => void;
  modelBLastResponseId: string | null;
  setModelBLastResponseId: (id: string | null) => void;
  debateSessionId: string | null;
  setDebateSessionId: (id: string | null) => void;
  existingDebateSessions: any[];
  setExistingDebateSessions: (sessions: any[]) => void;

  // Reset function
  reset: () => void;
}

const initialModelConfig: ModelConfiguration = {
  reasoningEffort: 'medium',
  reasoningSummary: 'detailed',
  textVerbosity: 'high',
  temperature: 0.7,
  maxTokens: 16384,
  enableReasoning: true,
  enableStructuredOutput: false
};

export function useDebateState(): DebateState {
  // Topic state
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [useCustomTopic, setUseCustomTopic] = useState(false);

  // Adversarial level
  const [adversarialLevel, setAdversarialLevel] = useState(3);

  // Model selection
  const [model1Id, setModel1Id] = useState('');
  const [model2Id, setModel2Id] = useState('');

  // Model configurations
  const [model1Config, setModel1Config] = useState<ModelConfiguration>(initialModelConfig);
  const [model2Config, setModel2Config] = useState<ModelConfiguration>(initialModelConfig);

  // Debate state
  const [messages, setMessages] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // UI state
  const [showSetup, setShowSetup] = useState(true);
  const [showSystemPrompts, setShowSystemPrompts] = useState(false);

  // Session tracking
  const [modelALastResponseId, setModelALastResponseId] = useState<string | null>(null);
  const [modelBLastResponseId, setModelBLastResponseId] = useState<string | null>(null);
  const [debateSessionId, setDebateSessionId] = useState<string | null>(null);
  const [existingDebateSessions, setExistingDebateSessions] = useState<any[]>([]);

  // Reset function
  const reset = () => {
    setSelectedTopic('');
    setCustomTopic('');
    setUseCustomTopic(false);
    setAdversarialLevel(3);
    setModel1Id('');
    setModel2Id('');
    setModel1Config(initialModelConfig);
    setModel2Config(initialModelConfig);
    setMessages([]);
    setCurrentRound(0);
    setIsRunning(false);
    setShowSetup(true);
    setShowSystemPrompts(false);
    setModelALastResponseId(null);
    setModelBLastResponseId(null);
    setDebateSessionId(null);
    setExistingDebateSessions([]);
  };

  return {
    // Topic state
    selectedTopic,
    setSelectedTopic,
    customTopic,
    setCustomTopic,
    useCustomTopic,
    setUseCustomTopic,

    // Adversarial level
    adversarialLevel,
    setAdversarialLevel,

    // Model selection
    model1Id,
    setModel1Id,
    model2Id,
    setModel2Id,

    // Model configurations
    model1Config,
    setModel1Config,
    model2Config,
    setModel2Config,

    // Debate state
    messages,
    setMessages,
    currentRound,
    setCurrentRound,
    isRunning,
    setIsRunning,

    // UI state
    showSetup,
    setShowSetup,
    showSystemPrompts,
    setShowSystemPrompts,

    // Session tracking
    modelALastResponseId,
    setModelALastResponseId,
    modelBLastResponseId,
    setModelBLastResponseId,
    debateSessionId,
    setDebateSessionId,
    existingDebateSessions,
    setExistingDebateSessions,

    // Reset function
    reset,
  };
}
