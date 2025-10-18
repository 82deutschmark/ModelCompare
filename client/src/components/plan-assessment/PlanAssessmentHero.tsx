/**
 * Author: gpt-5-codex
 * Date: 2025-10-18 18:45 UTC
 * PURPOSE: Hero form for the plan assessment mode, mirroring the modern compare
 *          layout while collecting plan inputs and managing inline model
 *          selection. Reuses shadcn/ui cards, floating model picker, and model
 *          pills to keep visual parity with the compare page experience.
 * SRP/DRY check: Pass - Single responsibility (plan assessment hero section),
 *                reuses shared comparison components without duplicating API logic.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingModelPicker } from "@/components/comparison/FloatingModelPicker";
import { ModelPill } from "@/components/comparison/ModelPill";
import {
  ClipboardList,
  Brain,
  Eye,
  Zap,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface PlanAssessmentHeroProps {
  finalPrompt: string;
  hobbyDev: "hobby" | "enterprise";
  onHobbyDevChange: (value: "hobby" | "enterprise") => void;
  constraints: string;
  onConstraintsChange: (value: string) => void;
  planMarkdown: string;
  onPlanMarkdownChange: (value: string) => void;
  contextSummary: string;
  onContextSummaryChange: (value: string) => void;
  models: AIModel[];
  modelsLoading: boolean;
  selectedModels: string[];
  loadingModels: Set<string>;
  responses: Record<string, ModelResponse>;
  onToggleModel: (modelId: string) => void;
  onSelectAllModels: (modelIds: string[]) => void;
  onClearAllModels: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  disableSubmitReason?: string;
}

export function PlanAssessmentHero({
  finalPrompt,
  hobbyDev,
  onHobbyDevChange,
  constraints,
  onConstraintsChange,
  planMarkdown,
  onPlanMarkdownChange,
  contextSummary,
  onContextSummaryChange,
  models,
  modelsLoading,
  selectedModels,
  loadingModels,
  responses,
  onToggleModel,
  onSelectAllModels,
  onClearAllModels,
  onSubmit,
  canSubmit,
  isSubmitting,
  disableSubmitReason,
}: PlanAssessmentHeroProps) {
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const planWordCount = useMemo(() => {
    const words = planMarkdown.trim().split(/\s+/).filter(Boolean);
    return planMarkdown.trim().length === 0 ? 0 : words.length;
  }, [planMarkdown]);

  const promptWordCount = useMemo(() => {
    const words = finalPrompt.trim().split(/\s+/).filter(Boolean);
    return finalPrompt.trim().length === 0 ? 0 : words.length;
  }, [finalPrompt]);

  const selectedModelObjects = useMemo(
    () => models.filter((model) => selectedModels.includes(model.id)),
    [models, selectedModels],
  );

  const modelPickerTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-dashed border-2 hover:border-primary/50 h-7"
      disabled={modelsLoading}
    >
      <Brain className="w-3 h-3" />
      Manage Models
      {selectedModels.length > 0 && (
        <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">
          {selectedModels.length}
        </Badge>
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Card className="relative">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2 text-sm">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span>Plan Assessment Brief</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-medium uppercase tracking-wide">
                {hobbyDev === "hobby" ? "Hobby" : "Enterprise"}
              </Badge>
              <span>{planWordCount} words</span>
              <span>{promptWordCount} prompt words</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{selectedModels.length === 0 ? "No models selected" : `${selectedModels.length} model${selectedModels.length === 1 ? "" : "s"} selected`}</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedModels.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7" onClick={onClearAllModels}>
                  Clear
                </Button>
              )}
              <FloatingModelPicker
                models={models}
                selectedModels={selectedModels}
                onToggleModel={onToggleModel}
                onSelectAllModels={onSelectAllModels}
                onClearAllModels={onClearAllModels}
                disabled={modelsLoading}
                trigger={modelPickerTrigger}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Project Type</Label>
                <Select value={hobbyDev} onValueChange={(value) => onHobbyDevChange(value as "hobby" | "enterprise")}> 
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hobby">Hobby</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Constraints</Label>
                <Textarea
                  rows={2}
                  value={constraints}
                  onChange={(event) => onConstraintsChange(event.target.value)}
                  placeholder="Any constraints (timeline, budget, compliance, tech stack)"
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Plan (Markdown or text)</Label>
              <Textarea
                rows={10}
                value={planMarkdown}
                onChange={(event) => onPlanMarkdownChange(event.target.value)}
                placeholder="Paste or write the plan to assess..."
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Context (optional)</Label>
              <Textarea
                rows={3}
                value={contextSummary}
                onChange={(event) => onContextSummaryChange(event.target.value)}
                placeholder="Assess my over-confident junior developer's plan. What is missing?"
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {modelsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-7 w-24" />
                ))
              ) : selectedModelObjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">Selected models will appear here as pills once added.</p>
              ) : (
                selectedModelObjects.map((model) => (
                  <ModelPill
                    key={model.id}
                    model={model}
                    isLoading={loadingModels.has(model.id)}
                    hasResponse={Boolean(responses[model.id])}
                    onRemove={onToggleModel}
                    variant="compact"
                  />
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {disableSubmitReason
                  ? disableSubmitReason
                  : canSubmit
                    ? "Ready to assess the plan"
                    : "Add plan details and choose models to begin"}
              </div>
              <Button
                onClick={onSubmit}
                disabled={!canSubmit || isSubmitting}
                size="sm"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-sm">Assessing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    <span className="text-sm">Assess Plan</span>
                  </>
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setShowPromptPreview((prev) => !prev)}
            >
              <Eye className="w-3 h-3 mr-1" />
              {showPromptPreview ? "Hide" : "Show"} Prompt Preview
            </Button>

            {showPromptPreview && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap">
                {finalPrompt}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
