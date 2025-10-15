/**
 * Debate setup panel component
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Composes all debate setup components into a unified setup panel
 * SRP/DRY check: Pass - Single responsibility for setup panel composition, no duplication with other setup components
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2, Play } from 'lucide-react';
import { DebateTopicSelector } from './DebateTopicSelector';
import { ModelSelector } from './ModelSelector';
import { AdversarialLevelSelector } from './AdversarialLevelSelector';
import type { DebateInstructions } from '@/lib/promptParser';
import type { AIModel } from '@/types/ai-models';
import type { ModelConfiguration } from '@/components/ModelConfigurationPanel';

interface DebateSetupPanelProps {
  // Data
  debateData: DebateInstructions | null;
  debateLoading: boolean;
  debateError: string | null;
  models: AIModel[];

  // State
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  customTopic: string;
  setCustomTopic: (topic: string) => void;
  useCustomTopic: boolean;
  setUseCustomTopic: (useCustom: boolean) => void;
  adversarialLevel: number;
  setAdversarialLevel: (level: number) => void;
  model1Id: string;
  setModel1Id: (modelId: string) => void;
  model2Id: string;
  setModel2Id: (modelId: string) => void;
  model1Config: ModelConfiguration;
  setModel1Config: (config: ModelConfiguration) => void;
  model2Config: ModelConfiguration;
  setModel2Config: (config: ModelConfiguration) => void;

  // Actions
  onStartDebate: () => void;
  isStreaming: boolean;
}

export function DebateSetupPanel({
  debateData,
  debateLoading,
  debateError,
  models,
  selectedTopic,
  setSelectedTopic,
  customTopic,
  setCustomTopic,
  useCustomTopic,
  setUseCustomTopic,
  adversarialLevel,
  setAdversarialLevel,
  model1Id,
  setModel1Id,
  model2Id,
  setModel2Id,
  model1Config,
  setModel1Config,
  model2Config,
  setModel2Config,
  onStartDebate,
  isStreaming,
}: DebateSetupPanelProps) {
  const canStart = model1Id && model2Id && !debateLoading && !debateError &&
    (!useCustomTopic && selectedTopic || useCustomTopic);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>Debate Setup</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Debate Topic Selection */}
          <DebateTopicSelector
            debateData={debateData}
            debateLoading={debateLoading}
            debateError={debateError}
            selectedTopic={selectedTopic}
            setSelectedTopic={setSelectedTopic}
            customTopic={customTopic}
            setCustomTopic={setCustomTopic}
            useCustomTopic={useCustomTopic}
            setUseCustomTopic={setUseCustomTopic}
          />

          {/* Model Selection and Configuration */}
          <ModelSelector
            models={models}
            model1Id={model1Id}
            setModel1Id={setModel1Id}
            model2Id={model2Id}
            setModel2Id={setModel2Id}
            model1Config={model1Config}
            setModel1Config={setModel1Config}
            model2Config={model2Config}
            setModel2Config={setModel2Config}
            isStreaming={isStreaming}
          />

          {/* Adversarial Intensity */}
          <AdversarialLevelSelector
            debateData={debateData}
            adversarialLevel={adversarialLevel}
            setAdversarialLevel={setAdversarialLevel}
            onStartDebate={onStartDebate}
            disabled={!canStart}
          />
        </div>
      </CardContent>
    </Card>
  );
}
