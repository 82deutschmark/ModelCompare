/*
 * Author: Cascade (GPT-5 medium reasoning)
 * Date: 2025-09-27T17:06:47-04:00
 * PURPOSE: Modular model selection panel extracted from home.tsx monolith.
 *          Uses existing ModelButton components with provider grouping logic.
 *          Maintains all selection functionality including provider-level controls.
 * SRP/DRY check: Pass - Single responsibility (model selection), reuses ModelButton
 * shadcn/ui: Pass - Uses Card, Button, Checkbox, Label components and ModelButton
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Brain } from "lucide-react";
import { ModelButton } from "@/components/ModelButton";
import { cn } from "@/lib/utils";
import type { AIModel } from "@/types/ai-models";

interface ModelSelectionPanelProps {
  models: AIModel[];
  selectedModels: string[];
  loadingModels: Set<string>;
  responses: Record<string, any>;
  modelsLoading: boolean;
  onToggleModel: (modelId: string) => void;
  onSelectAllModels: (modelIds: string[]) => void;
  onClearAllModels: () => void;
  showTiming: boolean;
  setShowTiming: (show: boolean) => void;
}

export function ModelSelectionPanel({
  models,
  selectedModels,
  loadingModels,
  responses,
  modelsLoading,
  onToggleModel,
  onSelectAllModels,
  onClearAllModels,
  showTiming,
  setShowTiming
}: ModelSelectionPanelProps) {

  // Group models by provider (extracted from home.tsx logic)
  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  // Provider-level selection handlers (from home.tsx)
  const handleProviderToggle = (provider: string, providerModels: AIModel[]) => {
    const providerModelIds = providerModels.map(m => m.id);
    const allSelected = providerModelIds.every(id => selectedModels.includes(id));
    
    if (allSelected) {
      // Deselect all models from this provider
      const newSelection = selectedModels.filter(id => !providerModelIds.includes(id));
      onSelectAllModels(newSelection);
    } else {
      // Select all models from this provider
      const newSelection = Array.from(new Set([...selectedModels, ...providerModelIds]));
      onSelectAllModels(newSelection);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <span>AI Models</span>
          </div>
          <div className="text-sm text-gray-500">
            {selectedModels.length} selected
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {modelsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Provider Groups */}
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {provider}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleProviderToggle(provider, providerModels)}
                      className="text-xs h-6 px-2"
                    >
                      {providerModels.every(model => selectedModels.includes(model.id)) ? 'None' : 'All'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
                  {providerModels.map((model) => (
                    <ModelButton
                      key={model.id}
                      model={model}
                      isSelected={selectedModels.includes(model.id)}
                      isAnalyzing={loadingModels.has(model.id)}
                      responseCount={responses[model.id] ? 1 : 0}
                      onToggle={onToggleModel}
                      disabled={loadingModels.has(model.id)}
                      showTiming={showTiming}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectAllModels(models.map(m => m.id))}
              disabled={selectedModels.length === models.length}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAllModels}
              disabled={selectedModels.length === 0}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="timing"
              checked={showTiming}
              onCheckedChange={(checked) => setShowTiming(checked === true)}
            />
            <Label htmlFor="timing" className="text-sm">
              Show response timing
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
