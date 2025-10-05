/*
 * Author: Cascade (GPT-5 medium reasoning)
 * Date: 2025-09-27T17:06:47-04:00
 * PURPOSE: Modular comparison results component extracted from home.tsx monolith.
 *          Container for ResponseCard components with empty state handling.
 *          Maintains grid layout and retry functionality delegation.
 * SRP/DRY check: Pass - Single responsibility (results display), reuses ResponseCard
 * shadcn/ui: Pass - Uses Card components and ResponseCard
 */

import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { ResponseCard } from "@/components/ResponseCard";
import { ExportButton } from "@/components/ExportButton";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface ComparisonResultsProps {
  models: AIModel[];
  responses: Record<string, ModelResponse>;
  selectedModels: string[];
  onRetry: (modelId: string) => void;
  showTiming: boolean;
  prompt: string;
  isComparing: boolean;
}

export function ComparisonResults({
  models,
  responses,
  selectedModels,
  onRetry,
  showTiming,
  prompt,
  isComparing
}: ComparisonResultsProps) {
  
  // Filter models to only show selected ones
  const selectedModelData = models.filter(model => selectedModels.includes(model.id));

  // Empty state when no models selected
  if (selectedModelData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">No Models Selected</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select some models from the panel on the left to start comparing AI responses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export Button - positioned above results */}
      <div className="flex justify-end">
        <ExportButton
          prompt={prompt}
          models={selectedModelData}
          responses={responses}
          disabled={isComparing}
        />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 gap-4">
        {selectedModelData.map((model) => (
          <ResponseCard
            key={model.id}
            model={model}
            response={responses[model.id]}
            onRetry={() => onRetry(model.id)}
            showTiming={showTiming}
          />
        ))}
      </div>
    </div>
  );
}
