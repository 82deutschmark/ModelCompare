/**
 * Author: Claude Sonnet 4
 * Date: 2025-09-28
 * PURPOSE: Modern hero-centered compare page with prompt-first design philosophy.
 *          Features EnhancedPromptArea as centerpiece with inline model selection.
 *          Removes sidebar layout in favor of floating model picker and model pills.
 *          Responsive design that scales from mobile to desktop with focus on UX.
 * SRP/DRY check: Pass - Single responsibility (page orchestration), reuses enhanced components
 * shadcn/ui: Pass - Uses enhanced shadcn/ui components with modern patterns
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, Sparkles } from "lucide-react";

// Enhanced components for modern design
import { AppNavigation } from "@/components/AppNavigation";
import { EnhancedPromptArea } from "@/components/comparison/EnhancedPromptArea";
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
  const [initialModelsSelected, setInitialModelsSelected] = useState(false);

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

  // Pre-select default models when they become available
  useEffect(() => {
    if (!initialModelsSelected && models.length > 0 && state.selectedModels.length === 0) {
      const defaultModels = [
        'gpt-5-nano-2025-08-07',        // GPT-5 Nano - fast and efficient
        'gemini-2.0-flash',             // Gemini 2.0 Flash - fast and cost-effective
        'gpt-4.1-nano-2025-04-14'       // GPT-4.1 Nano - good balance
      ].filter(modelId => models.some(m => m.id === modelId));

      if (defaultModels.length > 0) {
        actions.selectAllModels(defaultModels);
        setInitialModelsSelected(true);
      }
    }
  }, [models, state.selectedModels.length, initialModelsSelected, actions]);

  // Handler for prompt submission
  const handleSubmit = () => {
    actions.startComparison(prompt);
  };

  // Handler for model retry
  const handleRetry = (modelId: string) => {
    actions.retryModel(modelId, prompt);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavigation
        title="AI Model Comparison"
        subtitle="Compare responses across multiple AI models"
        icon={Sparkles}
      />

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* Hero Prompt Area - Centerpiece of the page */}
            <EnhancedPromptArea
              prompt={prompt}
              setPrompt={setPrompt}
              models={models}
              selectedModels={state.selectedModels}
              onToggleModel={actions.toggleModel}
              onSelectAllModels={actions.selectAllModels}
              onClearAllModels={actions.clearAllModels}
              onSubmit={handleSubmit}
              disabled={status.isComparing}
              isComparing={status.isComparing}
              showPromptPreview={showPromptPreview}
              setShowPromptPreview={setShowPromptPreview}
              loadingModels={state.loadingModels}
              responses={state.responses}
            />

            {/* Comparison Results - Appears below when models are running/completed */}
            {(status.isComparing || Object.keys(state.responses).length > 0) && (
              <ComparisonResults
                models={models}
                responses={state.responses}
                selectedModels={state.selectedModels}
                onRetry={handleRetry}
                showTiming={showTiming}
                prompt={prompt}
                isComparing={status.isComparing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
