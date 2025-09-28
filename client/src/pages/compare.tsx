/*
 * Author: Cascade (GPT-5 medium reasoning)
 * Date: 2025-09-27T17:06:47-04:00
 * PURPOSE: New modular compare page that replaces the monolithic home.tsx.
 *          Assembles reusable components: ModelSelectionPanel, PromptInput, ComparisonResults.
 *          Uses useComparison hook for state management and follows proper SRP/DRY principles.
 * SRP/DRY check: Pass - Single responsibility (page orchestration), reuses all existing components
 * shadcn/ui: Pass - Uses existing shadcn/ui components via composed components
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";

// Reusable components
import { AppNavigation } from "@/components/AppNavigation";
import { ModelSelectionPanel } from "@/components/comparison/ModelSelectionPanel";
import { PromptInput } from "@/components/comparison/PromptInput";
import { ComparisonResults } from "@/components/comparison/ComparisonResults";

// Custom hook for state management
import { useComparison } from "@/hooks/useComparison";

// Types
import type { AIModel } from "@/types/ai-models";

const DEFAULT_PROMPT = `• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`;

export default function Compare() {
  // State for UI-specific functionality
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [showTiming, setShowTiming] = useState(true);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Comparison state management via custom hook
  const { state, actions, status } = useComparison();

  // Fetch available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Handler for prompt submission
  const handleSubmit = () => {
    actions.startComparison(prompt);
  };

  // Handler for model retry
  const handleRetry = (modelId: string) => {
    actions.retryModel(modelId, prompt);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <AppNavigation
        title="AI Model Comparison"
        subtitle="Side-by-side model comparison"
        icon={Brain}
      />

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {/* Model Selection Panel - Responsive width */}
            <div className="md:col-span-1 lg:col-span-1 xl:col-span-1 overflow-y-auto">
              <ModelSelectionPanel
                models={models}
                selectedModels={state.selectedModels}
                loadingModels={state.loadingModels}
                responses={state.responses}
                modelsLoading={modelsLoading}
                onToggleModel={actions.toggleModel}
                onSelectAllModels={actions.selectAllModels}
                onClearAllModels={actions.clearAllModels}
                showTiming={showTiming}
                setShowTiming={setShowTiming}
              />
            </div>

            {/* Main Content Area - Responsive width */}
            <div className="md:col-span-1 lg:col-span-2 xl:col-span-3 overflow-y-auto space-y-4">
              {/* Prompt Input */}
              <PromptInput
                prompt={prompt}
                setPrompt={setPrompt}
                onSubmit={handleSubmit}
                disabled={status.isComparing}
                selectedModels={state.selectedModels}
                showPromptPreview={showPromptPreview}
                setShowPromptPreview={setShowPromptPreview}
              />

              {/* Comparison Results */}
              <ComparisonResults
                models={models}
                responses={state.responses}
                selectedModels={state.selectedModels}
                onRetry={handleRetry}
                showTiming={showTiming}
                prompt={prompt}
                isComparing={status.isComparing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
