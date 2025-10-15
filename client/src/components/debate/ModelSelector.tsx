/**
 * Model selector component for debate mode
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Handles model selection and configuration for both debate participants
 * SRP/DRY check: Pass - Single responsibility for model selection, no duplication with other model selection components
 */

import { Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ModelConfigurationPanel, type ModelConfiguration } from '@/components/ModelConfigurationPanel';
import type { AIModel } from '@/types/ai-models';

interface ModelSelectorProps {
  models: AIModel[];
  model1Id: string;
  setModel1Id: (modelId: string) => void;
  model2Id: string;
  setModel2Id: (modelId: string) => void;
  model1Config: ModelConfiguration;
  setModel1Config: (config: ModelConfiguration) => void;
  model2Config: ModelConfiguration;
  setModel2Config: (config: ModelConfiguration) => void;
  isStreaming: boolean;
}

export function ModelSelector({
  models,
  model1Id,
  setModel1Id,
  model2Id,
  setModel2Id,
  model1Config,
  setModel1Config,
  model2Config,
  setModel2Config,
  isStreaming,
}: ModelSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-2">
        <Users className="w-4 h-4" />
        <label className="text-sm font-medium">Debaters</label>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Affirmative (Pro) - {models.find(m => m.id === model1Id)?.name || 'Select Model'}
        </label>
        <Select value={model1Id} onValueChange={setModel1Id}>
          <SelectTrigger>
            <SelectValue placeholder="Select Pro debater" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center space-x-2">
                  <span>{model.name}</span>
                  <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Negative (Con) - {models.find(m => m.id === model2Id)?.name || 'Select Model'}
        </label>
        <Select value={model2Id} onValueChange={setModel2Id}>
          <SelectTrigger>
            <SelectValue placeholder="Select Con debater" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center space-x-2">
                  <span>{model.name}</span>
                  <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Model Configuration Panels */}
      {model1Id && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Model 1 Configuration</h4>
          <ModelConfigurationPanel
            configuration={model1Config}
            onConfigurationChange={setModel1Config}
            modelName={models.find(m => m.id === model1Id)?.name}
            modelProvider={models.find(m => m.id === model1Id)?.provider}
            isStreaming={isStreaming}
          />
        </div>
      )}

      {model2Id && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Model 2 Configuration</h4>
          <ModelConfigurationPanel
            configuration={model2Config}
            onConfigurationChange={setModel2Config}
            modelName={models.find(m => m.id === model2Id)?.name}
            modelProvider={models.find(m => m.id === model2Id)?.provider}
            isStreaming={isStreaming}
          />
        </div>
      )}
    </div>
  );
}
