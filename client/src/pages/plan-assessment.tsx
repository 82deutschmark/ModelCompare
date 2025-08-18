/**
 * Plan Assessment Page – Reuses existing compare flow to let multiple models critique a plan
 *
 * What this file does: Provides a UI for entering a plan and context, selecting models,
 * and submitting a composed "Assess This Plan" prompt to each selected model in parallel.
 * How it works: Mirrors the Home compare page's selection and response rendering using
 * existing components: AppNavigation, ModelButton, ResponseCard, ExportButton. Builds the
 * final prompt from the user's inputs per the default template provided by the user.
 * How the project uses it: Adds the new mode route "/plan-assessment" to evaluate plans
 * across models without introducing new APIs (uses /api/models/respond like Home).
 *
 * Author: Cascade
 * Date: 2025-08-17
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppNavigation } from "@/components/AppNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ModelButton } from "@/components/ModelButton";
import { ResponseCard } from "@/components/ResponseCard";
import { ExportButton } from "@/components/ExportButton";
import { Brain, ClipboardList, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AIModel, ModelResponse } from "@/types/ai-models";

export default function PlanAssessmentPage() {
  const { toast } = useToast();

  // Inputs per the user's default template
  const [hobbyDev, setHobbyDev] = useState<string>("enterprise"); // "hobby" | "enterprise"
  const [constraints, setConstraints] = useState<string>("");
  const [planMarkdown, setPlanMarkdown] = useState<string>("");
  const [contextSummary, setContextSummary] = useState<string>("");

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({});
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set());
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());
  const [showTiming, setShowTiming] = useState(true);

  // Models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/models"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("Failed to fetch models");
      return res.json() as Promise<AIModel[]>;
    },
  });

  // Compose the final prompt from inputs (default template from the user)
  const finalPrompt = useMemo(() => {
    const lines: string[] = [
      "## Assess This Plan",
      "You are the senior developer on the project.  Assess the Junior Developer's plan and provide feedback.  Do not use code snippets.  Assume the Junior Developer is already an expert who simply forgot, do not 'teach' them.  Be concise and to the point.",
      `{HobbyDev} ${hobbyDev === "hobby" ? "Hobby dev" : "enterprise"} level?`,
      `{Constraints} ${constraints || "(none provided)"}`,
      `{PlanMarkdown}\n${planMarkdown.trim()}`,
      `{ContextSummary|} ${contextSummary || ""}`,
    ];
    return lines.join("\n");
  }, [hobbyDev, constraints, planMarkdown, contextSummary]);

  // Mutation to request per-model response, same as Home
  const modelResponseMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelId: string }) => {
      const response = await apiRequest("POST", "/api/models/respond", data);
      const responseData = (await response.json()) as ModelResponse;
      return { modelId: data.modelId, response: responseData };
    },
    onSuccess: (data) => {
      const responseWithStatus = { ...data.response, status: "success" as const };
      setResponses((prev) => ({ ...prev, [data.modelId]: responseWithStatus }));
      setLoadingModels((prev) => {
        const ns = new Set(prev);
        ns.delete(data.modelId);
        return ns;
      });
      setCompletedModels((prev) => new Set([...Array.from(prev), data.modelId]));

      const model = models.find((m) => m.id === data.modelId);
      toast({
        title: `${model?.name || "Model"} Responded`,
        description: `Response received in ${(data.response.responseTime / 1000).toFixed(1)}s`,
      });
    },
    onError: (error: any, variables) => {
      setLoadingModels((prev) => {
        const ns = new Set(prev);
        ns.delete(variables.modelId);
        return ns;
      });
      setResponses((prev) => ({
        ...prev,
        [variables.modelId]: {
          content: "",
          status: "error" as const,
          responseTime: 0,
          error: error.message,
        },
      }));
      const model = models.find((m) => m.id === variables.modelId);
      toast({ title: `${model?.name || "Model"} Failed`, description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!planMarkdown.trim()) {
      toast({ title: "Enter a plan", description: "Paste or write a plan to assess.", variant: "destructive" });
      return;
    }
    if (selectedModels.length === 0) {
      toast({ title: "Select models", description: "Choose at least one model.", variant: "destructive" });
      return;
    }

    setResponses({});
    setLoadingModels(new Set(selectedModels));
    setCompletedModels(new Set());
    selectedModels.forEach((modelId) => modelResponseMutation.mutate({ prompt: finalPrompt, modelId }));
    toast({ title: "Assessment Started", description: `Requesting critiques from ${selectedModels.length} models...` });
  };

  const retryModel = (modelId: string) => {
    if (!planMarkdown.trim()) return;
    setLoadingModels((prev) => new Set([...Array.from(prev), modelId]));
    setCompletedModels((prev) => {
      const ns = new Set(prev);
      ns.delete(modelId);
      return ns;
    });
    setResponses((prev) => {
      const nr = { ...prev };
      delete nr[modelId];
      return nr;
    });
    modelResponseMutation.mutate({ prompt: finalPrompt, modelId });
  };

  const selectedModelData = models.filter((m) => selectedModels.includes(m.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation title="Plan Assessment" subtitle="Have multiple models critique a plan" icon={Brain} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Model selection */}
          <div className="xl:col-span-1">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-blue-600" />
                      <span>AI Models</span>
                    </div>
                    <div className="text-sm text-gray-500">{selectedModels.length} selected</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {modelsLoading ? (
                    <div className="grid grid-cols-1 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(
                        models.reduce((acc, model) => {
                          if (!acc[model.provider]) acc[model.provider] = [] as AIModel[];
                          (acc[model.provider] as AIModel[]).push(model);
                          return acc;
                        }, {} as Record<string, AIModel[]>)
                      ).map(([provider, providerModels]) => (
                        <div key={provider} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{provider}</h3>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const ids = (providerModels as AIModel[]).map((m) => m.id);
                                  const allSelected = ids.every((id) => selectedModels.includes(id));
                                  if (allSelected) {
                                    setSelectedModels((prev) => prev.filter((id) => !ids.includes(id)));
                                  } else {
                                    setSelectedModels((prev) => Array.from(new Set([...prev, ...ids])));
                                  }
                                }}
                                className="text-xs h-6 px-2"
                              >
                                {(providerModels as AIModel[]).every((m) => selectedModels.includes(m.id)) ? "None" : "All"}
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {(providerModels as AIModel[]).map((model) => (
                              <ModelButton
                                key={model.id}
                                model={model}
                                isSelected={selectedModels.includes(model.id)}
                                isAnalyzing={loadingModels.has(model.id)}
                                responseCount={responses[model.id] ? 1 : 0}
                                onToggle={(modelId) => {
                                  setSelectedModels((prev) =>
                                    prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
                                  );
                                }}
                                disabled={loadingModels.has(model.id)}
                                showTiming={showTiming}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main content */}
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <ClipboardList className="w-4 h-4" />
                  <span>Plan and Context</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Hobby vs Enterprise */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Project Type</Label>
                    <Select value={hobbyDev} onValueChange={setHobbyDev}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hobby">Hobby</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Constraints</Label>
                    <Textarea
                      rows={2}
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      placeholder="Any constraints (time, budget, compliance, stack)"
                    />
                  </div>
                </div>

                {/* Plan */}
                <div>
                  <Label className="text-xs">Plan (Markdown or text)</Label>
                  <Textarea
                    rows={10}
                    value={planMarkdown}
                    onChange={(e) => setPlanMarkdown(e.target.value)}
                    placeholder="Paste or write the plan to assess..."
                  />
                </div>

                {/* Context */}
                <div>
                  <Label className="text-xs">Context (optional)</Label>
                  <Textarea
                    rows={3}
                    value={contextSummary}
                    onChange={(e) => setContextSummary(e.target.value)}
                    placeholder="Any context to consider"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedModels.length === 0 ? "Select models to request assessments" : `Ready to assess with ${selectedModels.length} model${selectedModels.length !== 1 ? "s" : ""}`}
                  </div>
                  <div className="flex items-center space-x-2">
                    <ExportButton
                      prompt={finalPrompt}
                      models={selectedModelData}
                      responses={responses}
                      disabled={loadingModels.size > 0}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={loadingModels.size > 0 || !planMarkdown.trim() || selectedModels.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                      size="sm"
                    >
                      {loadingModels.size > 0 ? (
                        <>
                          <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="text-sm">Assessing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          <span className="text-sm">Assess Plan</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {selectedModelData.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {selectedModelData.map((model) => (
                  <ResponseCard
                    key={model.id}
                    model={model}
                    response={responses[model.id]}
                    onRetry={() => retryModel(model.id)}
                    showTiming={showTiming}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
