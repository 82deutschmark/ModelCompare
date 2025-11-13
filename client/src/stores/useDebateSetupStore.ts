/*
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-10-22
 * PURPOSE: Zustand store for debate setup state (models, configs, topic, intensity).
 *          Converted from useState hook to fix state sharing issue - all components
 *          now access the same shared state instance.
 * SRP/DRY check: Pass - Single source of truth for debate setup configuration
 */

import { create } from 'zustand';
import type { ModelConfiguration } from '@/components/ModelConfigurationPanel';

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

export interface DebateSetupState {
  // Topic state
  selectedTopic: string;
  customTopic: string;
  useCustomTopic: boolean;

  // Model selection
  model1Id: string;
  model2Id: string;

  // Model configurations
  model1Config: ModelConfiguration;
  model2Config: ModelConfiguration;

  // Intensity
  adversarialLevel: number;

  // UI state
  showSetup: boolean;
  showSystemPrompts: boolean;

  // Actions
  setSelectedTopic: (topic: string) => void;
  setCustomTopic: (topic: string) => void;
  setUseCustomTopic: (useCustom: boolean) => void;
  setModel1Id: (modelId: string) => void;
  setModel2Id: (modelId: string) => void;
  setModel1Config: (config: ModelConfiguration) => void;
  setModel2Config: (config: ModelConfiguration) => void;
  setAdversarialLevel: (level: number) => void;
  setShowSetup: (show: boolean) => void;
  setShowSystemPrompts: (show: boolean) => void;
  resetSetup: () => void;
}

export const useDebateSetupStore = create<DebateSetupState>((set) => ({
  // Initial state
  selectedTopic: '',
  customTopic: '',
  useCustomTopic: false,
  model1Id: DEFAULT_MODEL_1_ID,
  model2Id: DEFAULT_MODEL_2_ID,
  model1Config: { ...initialModelConfig },
  model2Config: { ...initialModelConfig },
  adversarialLevel: DEFAULT_INTENSITY,
  showSetup: true,
  showSystemPrompts: false,

  // Actions
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
  setCustomTopic: (topic) => set({ customTopic: topic }),
  setUseCustomTopic: (useCustom) => set({ useCustomTopic: useCustom }),
  setModel1Id: (modelId) => set({ model1Id: modelId }),
  setModel2Id: (modelId) => set({ model2Id: modelId }),
  setModel1Config: (config) => set({ model1Config: config }),
  setModel2Config: (config) => set({ model2Config: config }),
  setAdversarialLevel: (level) => set({ adversarialLevel: level }),
  setShowSetup: (show) => set({ showSetup: show }),
  setShowSystemPrompts: (show) => set({ showSystemPrompts: show }),
  resetSetup: () => set({
    selectedTopic: '',
    customTopic: '',
    useCustomTopic: false,
    adversarialLevel: DEFAULT_INTENSITY,
    model1Id: DEFAULT_MODEL_1_ID,
    model2Id: DEFAULT_MODEL_2_ID,
    model1Config: { ...initialModelConfig },
    model2Config: { ...initialModelConfig },
    showSetup: true,
    showSystemPrompts: false,
  }),
}));
