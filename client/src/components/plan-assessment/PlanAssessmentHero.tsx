/**
 * Author: gpt-5-codex
 * Date: 2025-10-18 20:10 UTC
 * PURPOSE: Hero form for the plan assessment mode, mirroring the modern compare
 *          layout while collecting plan inputs and managing inline model
 *          selection. Updated to launch with vibrant gradients, colorful pills,
 *          and accentuated buttons while preserving shared comparison logic.
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
      variant="default"
      size="sm"
      className="gap-1.5 h-8 bg-gradient-to-r from-primary via-fuchsia-500 to-orange-400 text-primary-foreground shadow-md hover:shadow-lg transition-all"
      disabled={modelsLoading}
    >
      <Brain className="w-3 h-3 drop-shadow-sm" />
      Manage Models
      {selectedModels.length > 0 && (
        <Badge
          variant="secondary"
          className="ml-1 h-4 px-1.5 text-[0.65rem] uppercase tracking-wide bg-background/80 text-primary border-none"
        >
          {selectedModels.length}
        </Badge>
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-2 border-primary/20 shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="pointer-events-none absolute -top-24 -right-10 h-48 w-48 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-12 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />

        <CardHeader className="relative pb-4">
          <CardTitle className="flex flex-col gap-3 text-base">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="w-4 h-4 text-primary drop-shadow-sm" />
                <span className="font-semibold bg-gradient-to-r from-primary via-fuchsia-500 to-orange-500 bg-clip-text text-transparent">
                  Plan Assessment Brief
                </span>
              </div>
              <Badge className="bg-gradient-to-r from-primary/80 to-fuchsia-500/80 text-primary-foreground text-[0.65rem] uppercase tracking-wide shadow-sm">
                {hobbyDev === "hobby" ? "Hobby" : "Enterprise"}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 font-medium text-primary">
                <Sparkles className="w-3 h-3" />
                {planWordCount} plan words
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-1 font-medium text-fuchsia-600">
                <Eye className="w-3 h-3" />
                {promptWordCount} prompt words
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="relative space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                {selectedModels.length === 0
                  ? "No models selected"
                  : `${selectedModels.length} model${selectedModels.length === 1 ? "" : "s"} selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedModels.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={onClearAllModels}
                >
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

          <Separator className="bg-gradient-to-r from-primary/30 via-transparent to-fuchsia-300/30" />

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-primary">Project Type</Label>
                <Select value={hobbyDev} onValueChange={(value) => onHobbyDevChange(value as "hobby" | "enterprise")}>
                  <SelectTrigger className="w-full h-9 text-sm border-primary/30 bg-background/80 backdrop-blur-sm">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hobby">Hobby</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-fuchsia-600">Constraints</Label>
                <Textarea
                  rows={2}
                  value={constraints}
                  onChange={(event) => onConstraintsChange(event.target.value)}
                  placeholder="Any constraints (timeline, budget, compliance, tech stack)"
                  className="text-sm border-primary/20 bg-background/70 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-orange-600">Plan (Markdown or text)</Label>
              <Textarea
                rows={10}
                value={planMarkdown}
                onChange={(event) => onPlanMarkdownChange(event.target.value)}
                placeholder="Paste or write the plan to assess..."
                className="text-sm border-primary/25 bg-background/75 backdrop-blur focus-visible:ring-2 focus-visible:ring-fuchsia-400/40"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-primary">Context (optional)</Label>
              <Textarea
                rows={3}
                value={contextSummary}
                onChange={(event) => onContextSummaryChange(event.target.value)}
                placeholder="Assess my over-confident junior developer's plan. What is missing?"
                className="text-sm border-primary/20 bg-background/75 backdrop-blur focus-visible:ring-2 focus-visible:ring-orange-400/40"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {modelsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-28 rounded-full bg-primary/20" />
                ))
              ) : selectedModelObjects.length === 0 ? (
                <p className="text-xs text-primary/80">Selected models will appear here as vibrant pills once added.</p>
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
              <div className="text-xs text-primary font-medium">
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
                className="gap-2 bg-gradient-to-r from-primary via-fuchsia-500 to-orange-400 text-primary-foreground shadow-lg hover:brightness-105"
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
              className="h-8 text-xs px-3 text-primary hover:bg-primary/10"
              onClick={() => setShowPromptPreview((prev) => !prev)}
            >
              <Eye className="w-3 h-3 mr-1" />
              {showPromptPreview ? "Hide" : "Show"} Prompt Preview
            </Button>

            {showPromptPreview && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs font-mono whitespace-pre-wrap">
                {finalPrompt}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
