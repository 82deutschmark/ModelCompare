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
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Users className="w-3 h-3" />
        <label className="text-xs font-medium">Debaters</label>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block">
            Affirmative (Pro)
          </label>
          <Select value={model1Id} onValueChange={setModel1Id}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select Pro debater" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{model.name}</span>
                    <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">
            Negative (Con)
          </label>
          <Select value={model2Id} onValueChange={setModel2Id}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select Con debater" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{model.name}</span>
                    <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Model Configuration Panels - More Compact */}
      {model1Id && (
        <div className="pt-2 border-t">
          <div className="mb-2">
            <h4 className="text-xs font-medium">Model 1 Config</h4>
          </div>
          <ModelConfigurationPanel
            configuration={model1Config}
            onConfigurationChange={setModel1Config}
            modelName={models.find(m => m.id === model1Id)?.name}
            modelProvider={models.find(m => m.id === model1Id)?.provider}
            modelSupportsTemperature={models.find(m => m.id === model1Id)?.supportsTemperature}
            modelIsReasoning={models.find(m => m.id === model1Id)?.isReasoning}
            modelSupportsStructuredOutput={models.find(m => m.id === model1Id)?.supportsStructuredOutput}
            isStreaming={isStreaming}
          />
        </div>
      )}

      {model2Id && (
        <div className="pt-2 border-t">
          <div className="mb-2">
            <h4 className="text-xs font-medium">Model 2 Config</h4>
          </div>
          <ModelConfigurationPanel
            configuration={model2Config}
            onConfigurationChange={setModel2Config}
            modelName={models.find(m => m.id === model2Id)?.name}
            modelProvider={models.find(m => m.id === model2Id)?.provider}
            modelSupportsTemperature={models.find(m => m.id === model2Id)?.supportsTemperature}
            modelIsReasoning={models.find(m => m.id === model2Id)?.isReasoning}
            modelSupportsStructuredOutput={models.find(m => m.id === model2Id)?.supportsStructuredOutput}
            isStreaming={isStreaming}
          />
        </div>
      )}
    </div>
  );
}
