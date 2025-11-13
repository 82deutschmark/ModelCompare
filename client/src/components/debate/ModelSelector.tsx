/**
 * Model selector component for debate mode
 *
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-10-22
 * PURPOSE: Handles model selection and configuration for both debate participants.
 *          Refactored to use useDebateSetup and useQuery hooks directly.
 *          Includes collapsible config panels to reduce visual clutter.
 * SRP/DRY check: Pass - Single responsibility for model selection, uses existing hooks
 */

import { Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ModelConfigurationPanel } from '@/components/ModelConfigurationPanel';
import { useDebateSetup } from '@/hooks/useDebateSetup';
import { useDebateStreaming } from '@/hooks/useDebateStreaming';
import type { AIModel } from '@/types/ai-models';

export function ModelSelector() {
  const {
    model1Id,
    setModel1Id,
    model2Id,
    setModel2Id,
    model1Config,
    setModel1Config,
    model2Config,
    setModel2Config,
  } = useDebateSetup();

  const { isStreaming } = useDebateStreaming();

  const { data: models = [] } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });
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

      {/* Model Configuration Panels - Always Expanded */}
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
