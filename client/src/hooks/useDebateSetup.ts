/**
 * Custom hook for managing debate setup state
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Manages debate setup state including topic selection, model configuration, and UI state
 * SRP/DRY check: Pass - Single responsibility for debate setup state management
 */

import { useState } from 'react';
import type { ModelConfiguration } from '@/components/ModelConfigurationPanel';

export interface DebateSetupState {
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

  // UI state
  showSetup: boolean;
  setShowSetup: (show: boolean) => void;
  showSystemPrompts: boolean;
  setShowSystemPrompts: (show: boolean) => void;

  // Reset function for setup state
  resetSetup: () => void;
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

export function useDebateSetup(): DebateSetupState {
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

  // UI state
  const [showSetup, setShowSetup] = useState(true);
  const [showSystemPrompts, setShowSystemPrompts] = useState(false);

  // Reset function for setup state
  const resetSetup = () => {
    setSelectedTopic('');
    setCustomTopic('');
    setUseCustomTopic(false);
    setAdversarialLevel(3);
    setModel1Id('');
    setModel2Id('');
    setModel1Config(initialModelConfig);
    setModel2Config(initialModelConfig);
    setShowSetup(true);
    setShowSystemPrompts(false);
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

    // UI state
    showSetup,
    setShowSetup,
    showSystemPrompts,
    setShowSystemPrompts,

    // Reset function
    resetSetup,
  };
}
