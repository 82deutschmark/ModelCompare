/*
 * Author: gpt-5-codex
 * Date: 2025-02-14 00:10 UTC
 * PURPOSE: Manage debate setup state including dynamic topic defaults, model configuration, and setup visibility controls.
 * SRP/DRY check: Pass - Hook encapsulates setup state management without duplicating debate session logic.
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

const DEFAULT_MODEL_1_ID = 'gpt-5-mini-2025-08-07';
const DEFAULT_MODEL_2_ID = 'gpt-5-nano-2025-08-07';
const DEFAULT_INTENSITY = 3;

export function useDebateSetup(): DebateSetupState {
  // Topic state
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [useCustomTopic, setUseCustomTopic] = useState(false);

  // Adversarial level
  const [adversarialLevel, setAdversarialLevel] = useState(DEFAULT_INTENSITY);

  // Model selection
  const [model1Id, setModel1Id] = useState(DEFAULT_MODEL_1_ID);
  const [model2Id, setModel2Id] = useState(DEFAULT_MODEL_2_ID);

  // Model configurations
  const [model1Config, setModel1Config] = useState<ModelConfiguration>({ ...initialModelConfig });
  const [model2Config, setModel2Config] = useState<ModelConfiguration>({ ...initialModelConfig });

  // UI state
  const [showSetup, setShowSetup] = useState(true);
  const [showSystemPrompts, setShowSystemPrompts] = useState(false);

  // Reset function for setup state
  const resetSetup = () => {
    setSelectedTopic('');
    setCustomTopic('');
    setUseCustomTopic(false);
    setAdversarialLevel(DEFAULT_INTENSITY);
    setModel1Id(DEFAULT_MODEL_1_ID);
    setModel2Id(DEFAULT_MODEL_2_ID);
    setModel1Config({ ...initialModelConfig });
    setModel2Config({ ...initialModelConfig });
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
