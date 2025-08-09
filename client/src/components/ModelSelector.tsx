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
      const newSelection = Array.from(new Set([...selectedModels, ...providerModels]));
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-white">All Providers</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Clear All
        </Button>
      </div>

      {Object.entries(groupedModels).map(([provider, providerModels]) => (
        <div key={provider} className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{provider}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleProvider(provider)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {providerGroups[provider as keyof typeof providerGroups]?.every(id => selectedModels.includes(id)) 
                ? 'None' 
                : 'All'
              }
            </Button>
          </div>
          
          <div className="space-y-2 pl-2">
            {providerModels.map((model) => (
              <div key={model.id} className="flex items-center space-x-2">
                <Checkbox
                  id={model.id}
                  checked={selectedModels.includes(model.id)}
                  onCheckedChange={() => toggleModel(model.id)}
                  className="h-4 w-4"
                />
                <label
                  htmlFor={model.id}
                  className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer flex-1 leading-tight"
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
