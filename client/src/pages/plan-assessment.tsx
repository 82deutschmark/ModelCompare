/**
 * Author: gpt-5-codex
 * Date: 2025-10-18 21:06 UTC
 * PURPOSE: Plan assessment mode page aligned with the compare layout. Reuses the
 *          shared comparison hook, floating model picker, and results grid while
 *          adding plan-specific form inputs to build the assessment prompt.
 *          Updated to pre-select the colorful default trio of models for a
 *          vibrant first-run experience and centralizes default model IDs via a
 *          shared config.
 * SRP/DRY check: Pass - Page orchestrates plan assessment flow via shared
 *                components without duplicating mutation logic.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { AppNavigation } from "@/components/AppNavigation";
import { PlanAssessmentHero } from "@/components/plan-assessment/PlanAssessmentHero";
import { ComparisonResults } from "@/components/comparison/ComparisonResults";
import { PLAN_ASSESSMENT_DEFAULT_MODEL_IDS } from "@/config/planAssessmentDefaults";
import { useComparison } from "@/hooks/useComparison";
import { useToast } from "@/hooks/use-toast";
import type { AIModel } from "@/types/ai-models";

export default function PlanAssessmentPage() {
  const { toast } = useToast();
  const [projectType, setProjectType] = useState<"hobby" | "enterprise">("enterprise");
  const [constraints, setConstraints] = useState<string>("");
  const [planMarkdown, setPlanMarkdown] = useState<string>("");
  const [contextSummary, setContextSummary] = useState<string>("");
  const [initialModelsSelected, setInitialModelsSelected] = useState<boolean>(false);

  const { state, actions, status } = useComparison();

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/models"],
    queryFn: async () => {
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error("Failed to fetch models");
      return response.json() as Promise<AIModel[]>;
    },
  });

  useEffect(() => {
    if (!initialModelsSelected && models.length > 0 && state.selectedModels.length === 0) {
      const availableDefaults = PLAN_ASSESSMENT_DEFAULT_MODEL_IDS.filter((modelId) =>
        models.some((model) => model.id === modelId),
      );

      if (availableDefaults.length > 0) {
        actions.selectAllModels(availableDefaults);
        setInitialModelsSelected(true);
      }
    }
  }, [models, state.selectedModels.length, initialModelsSelected, actions]);

  const finalPrompt = useMemo(() => {
    const lines: string[] = [
      "## Assess This Plan",
      "You are the senior developer on the project. Assess the Junior Developer's plan and provide feedback. Do not use code snippets. Assume the Junior Developer is already an expert who simply forgot, do not 'teach' them. Be concise and to the point.",
      `{HobbyDev} ${projectType === "hobby" ? "Hobby dev" : "Enterprise"} level?`,
      `{Constraints} ${constraints.trim() || "(none provided)"}`,
      `{PlanMarkdown}\n${planMarkdown.trim()}`,
      `{ContextSummary|} ${contextSummary.trim()}`,
    ];

    return lines.join("\n");
  }, [projectType, constraints, planMarkdown, contextSummary]);

  const hasPlan = planMarkdown.trim().length > 0;
  const canSubmit = hasPlan && status.canStartComparison(finalPrompt);
  const disableSubmitReason = !hasPlan
    ? "Provide plan content to generate critiques"
    : state.selectedModels.length === 0
      ? "Select at least one model"
      : status.isComparing
        ? "Assessment in progress"
        : undefined;

  const handleAssess = () => {
    if (!hasPlan) {
      toast({
        title: "Add a plan", 
        description: "Paste or write the plan to assess before requesting critiques.",
        variant: "destructive",
      });
      return;
    }

    if (state.selectedModels.length === 0) {
      toast({
        title: "Select models",
        description: "Choose at least one model to run the assessment.",
        variant: "destructive",
      });
      return;
    }

    actions.startComparison(finalPrompt);
  };

  const handleRetry = (modelId: string) => {
    actions.retryModel(modelId, finalPrompt);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavigation title="Plan Assessment" subtitle="Have multiple models critique a plan" icon={Brain} />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <PlanAssessmentHero
            finalPrompt={finalPrompt}
            hobbyDev={projectType}
            onHobbyDevChange={setProjectType}
            constraints={constraints}
            onConstraintsChange={setConstraints}
            planMarkdown={planMarkdown}
            onPlanMarkdownChange={setPlanMarkdown}
            contextSummary={contextSummary}
            onContextSummaryChange={setContextSummary}
            models={models}
            modelsLoading={modelsLoading}
            selectedModels={state.selectedModels}
            loadingModels={state.loadingModels}
            responses={state.responses}
            onToggleModel={actions.toggleModel}
            onSelectAllModels={actions.selectAllModels}
            onClearAllModels={actions.clearAllModels}
            onSubmit={handleAssess}
            canSubmit={canSubmit}
            isSubmitting={status.isComparing}
            disableSubmitReason={disableSubmitReason}
          />

          {(status.isComparing || status.hasResponses) && (
            <ComparisonResults
              models={models}
              responses={state.responses}
              selectedModels={state.selectedModels}
              onRetry={handleRetry}
              showTiming={true}
              prompt={finalPrompt}
              isComparing={status.isComparing}
            />
          )}
        </div>
      </div>
    </div>
  );
}
