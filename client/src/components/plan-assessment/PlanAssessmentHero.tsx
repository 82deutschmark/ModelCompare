/**
 * Author: Cascade (GPT-5)
 * Date: 2025-11-05 14:05 UTC-05:00
 * PURPOSE: Plan Assessment hero form that renders variable-driven inputs while
 *          adapting labels, placeholders, and option sets for software vs.
 *          academic domains. Integrates per-model reasoning controls and
 *          FloatingModelPicker for consistent model management.
 * SRP/DRY check: Pass - Component orchestrates UI for plan assessment inputs,
 *                delegating configuration panels and domain metadata helpers.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingModelPicker } from "@/components/comparison/FloatingModelPicker";
import { ModelPill } from "@/components/comparison/ModelPill";
import { ModelConfigurationPanel } from "@/components/ModelConfigurationPanel";
import type { ModelConfiguration } from "@/components/ModelConfigurationPanel";
import type {
  AssessmentDomain,
  DomainMetadata,
  DomainOption,
} from "@/config/planAssessmentDomainConfig";
import {
  ClipboardList,
  Brain,
  Eye,
  Zap,
  Loader2,
  Sparkles,
  Settings,
  ChevronDown,
  FileText,
} from "lucide-react";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface PlanAssessmentHeroProps {
  promptPreview: string;
  variables: Record<string, string>;
  onVariableChange: (name: string, value: string) => void;
  assessmentDomain: AssessmentDomain;
  domainOptions: DomainOption[];
  domainMetadata: DomainMetadata;
  criteriaOptions: DomainOption[];
  projectScaleOptions: DomainOption[];
  onDomainChange: (domain: AssessmentDomain) => void;
  modelConfigs: Record<string, ModelConfiguration>;
  onModelConfigChange: (modelId: string, config: ModelConfiguration) => void;
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
  promptPreview,
  variables,
  onVariableChange,
  assessmentDomain,
  domainOptions,
  domainMetadata,
  criteriaOptions,
  projectScaleOptions,
  onDomainChange,
  modelConfigs,
  onModelConfigChange,
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const planWordCount = useMemo(() => {
    const words = (variables.planMarkdown || '').trim().split(/\s+/).filter(Boolean);
    return (variables.planMarkdown || '').trim().length === 0 ? 0 : words.length;
  }, [variables.planMarkdown]);

  const promptWordCount = useMemo(() => {
    const words = promptPreview.trim().split(/\s+/).filter(Boolean);
    return promptPreview.trim().length === 0 ? 0 : words.length;
  }, [promptPreview]);

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
                  Plan & Paper Assessment
                </span>
              </div>
              <Badge className="bg-gradient-to-r from-primary/80 to-fuchsia-500/80 text-primary-foreground text-[0.65rem] uppercase tracking-wide shadow-sm">
                {variables.projectScale || 'startup'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 font-medium text-primary">
                <Sparkles className="w-3 h-3" />
                {planWordCount} words
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-1 font-medium text-fuchsia-600">
                <Eye className="w-3 h-3" />
                {selectedModels.length} models
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="relative space-y-5">
          {/* Model Selection */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                {selectedModels.length === 0
                  ? "No models selected"
                  : `${selectedModels.length} model${selectedModels.length === 1 ? "" : "s"} selected`}
              </span>
              <span className="rounded-full bg-fuchsia-500/10 px-2 py-1 text-fuchsia-600">
                {domainMetadata.label}
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

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-primary flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Assessment Domain
              </Label>
              <Select
                value={assessmentDomain}
                onValueChange={(value) => onDomainChange(value as AssessmentDomain)}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-primary">{option.label}</span>
                        {option.description && (
                          <span className="text-muted-foreground">{option.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-primary flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                Selected Evaluation Lens
              </Label>
              <div className="mt-1 rounded-md border border-primary/20 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                {criteriaOptions.find((option) => option.value === (variables.assessmentCriteria || "overall"))?.label ??
                  "Overall"}
              </div>
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-primary/30 via-transparent to-fuchsia-300/30" />

          {/* Main Content - Plan/Paper Markdown */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-orange-600 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {domainMetadata.label} Content (Required)
            </Label>
            <Textarea
              rows={12}
              value={variables.planMarkdown || ''}
              onChange={(e) => onVariableChange('planMarkdown', e.target.value)}
              placeholder={domainMetadata.planPlaceholder}
              className="text-sm border-primary/25 bg-background/75 backdrop-blur focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 mt-1"
            />
          </div>

          {/* Context Summary - Custom Instructions */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-primary">Custom Instructions (Optional)</Label>
            <Textarea
              rows={2}
              value={variables.contextSummary || ''}
              onChange={(e) => onVariableChange('contextSummary', e.target.value)}
              placeholder={domainMetadata.contextPlaceholder}
              className="text-sm border-primary/20 bg-background/75 backdrop-blur focus-visible:ring-2 focus-visible:ring-orange-400/40 mt-1"
            />
          </div>

          {/* Assessment Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-fuchsia-600">{domainMetadata.criteriaLabel}</Label>
              <Select
                value={variables.assessmentCriteria || 'overall'}
                onValueChange={(value) => onVariableChange('assessmentCriteria', value)}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {criteriaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-fuchsia-600">{domainMetadata.scaleLabel}</Label>
              <Select
                value={variables.projectScale || 'startup'}
                onValueChange={(value) => onVariableChange('projectScale', value)}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectScaleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Options - Collapsible */}
          <div className="border border-primary/20 rounded-lg p-3 bg-background/50">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center justify-between w-full text-xs font-medium text-primary hover:text-primary/80"
            >
              <span className="flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Advanced Options
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
            </button>

            {showAdvancedOptions && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Assessor Role</Label>
                    <Select
                      value={variables.assessorRole || 'principal-eng'}
                      onValueChange={(value) => onVariableChange('assessorRole', value)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chief-architect">Chief Architect</SelectItem>
                        <SelectItem value="principal-eng">Principal Engineer</SelectItem>
                        <SelectItem value="sre-lead">SRE Lead</SelectItem>
                        <SelectItem value="security-architect">Security Architect</SelectItem>
                        <SelectItem value="product-ops">Product/Ops</SelectItem>
                        <SelectItem value="peer-reviewer">Peer Reviewer (AI Slop Hunter)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Tone</Label>
                    <Select
                      value={variables.tone || 'balanced'}
                      onValueChange={(value) => onVariableChange('tone', value)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="thorough">Thorough</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Scoring Scale</Label>
                    <Select
                      value={variables.scoringScale || '1-5'}
                      onValueChange={(value) => onVariableChange('scoringScale', value)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5</SelectItem>
                        <SelectItem value="1-10">1-10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Actionability</Label>
                    <Select
                      value={variables.actionability || 'mixed'}
                      onValueChange={(value) => onVariableChange('actionability', value)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="must-fix">Must-Fix</SelectItem>
                        <SelectItem value="should-fix">Should-Fix</SelectItem>
                        <SelectItem value="nice-to-have">Nice-to-Have</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Constraints (Optional)</Label>
                  <Textarea
                    rows={2}
                    value={variables.constraints || ''}
                    onChange={(e) => onVariableChange('constraints', e.target.value)}
                    placeholder="Timeline, budget, compliance, tech stack constraints..."
                    className="text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Iteration Round</Label>
                    <Input
                      type="number"
                      min="1"
                      value={variables.iterationRound || '1'}
                      onChange={(e) => onVariableChange('iterationRound', e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Owner Model (Optional)</Label>
                    <Input
                      value={variables.ownerModelName || ''}
                      onChange={(e) => onVariableChange('ownerModelName', e.target.value)}
                      placeholder="e.g., GPT-5"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Model Pills and Configuration */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {modelsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-28 rounded-full bg-primary/20" />
                ))
              ) : selectedModelObjects.length === 0 ? (
                <p className="text-xs text-primary/80">Selected models will appear here. Click "Manage Models" to add.</p>
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

            {/* Model Configuration Panels */}
            {selectedModelObjects.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-primary">Model Configuration</Label>
                {selectedModelObjects.map((model) => (
                  <div key={model.id} className="border border-primary/20 rounded-lg p-3 bg-background/30">
                    <ModelConfigurationPanel
                      configuration={modelConfigs[model.id] || {
                        reasoningEffort: 'medium',
                        reasoningSummary: 'auto',
                        textVerbosity: 'medium',
                        temperature: 1.0,
                        maxTokens: 16000,
                        enableReasoning: true,
                        enableStructuredOutput: false,
                      }}
                      onConfigurationChange={(config) => onModelConfigChange(model.id, config)}
                      modelName={model.name}
                      modelProvider={model.provider}
                      modelSupportsTemperature={model.supportsTemperature}
                      modelIsReasoning={model.isReasoning}
                      modelSupportsStructuredOutput={model.supportsStructuredOutput}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Controls */}
          <Separator className="bg-gradient-to-r from-primary/30 via-transparent to-fuchsia-300/30" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-primary font-medium">
              {disableSubmitReason
                ? disableSubmitReason
                : canSubmit
                  ? "Ready to assess"
                  : "Add content and select models to begin"}
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
                  <span className="text-sm">Assess</span>
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
              {promptPreview}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
