import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { providerGroups } from "@/types/ai-models";
import type { AIModel } from "@/types/ai-models";

interface ModelSelectorProps {
  models: AIModel[];
  selectedModels: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function ModelSelector({ models, selectedModels, onSelectionChange }: ModelSelectorProps) {
  const toggleModel = (modelId: string) => {
    const isSelected = selectedModels.includes(modelId);
    if (isSelected) {
      onSelectionChange(selectedModels.filter(id => id !== modelId));
    } else {
      onSelectionChange([...selectedModels, modelId]);
    }
  };

  const toggleProvider = (provider: string) => {
    const providerModels = providerGroups[provider as keyof typeof providerGroups] || [];
    const allSelected = providerModels.every(id => selectedModels.includes(id));
    
    if (allSelected) {
      // Deselect all models from this provider
      onSelectionChange(selectedModels.filter(id => !providerModels.includes(id)));
    } else {
      // Select all models from this provider
      const newSelection = [...new Set([...selectedModels, ...providerModels])];
      onSelectionChange(newSelection);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Models</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-brand-500 hover:text-brand-600"
        >
          Clear All
        </Button>
      </div>

      {Object.entries(groupedModels).map(([provider, providerModels]) => (
        <div key={provider} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{provider}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleProvider(provider)}
              className="text-xs text-brand-500 hover:text-brand-600"
            >
              {providerGroups[provider as keyof typeof providerGroups]?.every(id => selectedModels.includes(id)) 
                ? 'Deselect All' 
                : 'Select All'
              }
            </Button>
          </div>
          
          <div className="space-y-3">
            {providerModels.map((model) => (
              <div key={model.id} className="flex items-center space-x-3">
                <Checkbox
                  id={model.id}
                  checked={selectedModels.includes(model.id)}
                  onCheckedChange={() => toggleModel(model.id)}
                />
                <label
                  htmlFor={model.id}
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
                >
                  {model.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
