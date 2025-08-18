/**
 * Creative Combat Page - Manual Sequential Creative Editing
 * 
 * This page implements a MANUAL, SEQUENTIAL creative editing process where:
 * 1. User selects multiple AI models and enters a creative prompt
 * 2. First model creates original content from the prompt
 * 3. SYSTEM STOPS and waits for user to manually choose the next editor and provide enhancement prompts
 * 4. User selects which model should enhance the previous work and selects or modifies the {enhancementPrompt}
 * 5. Selected model is sent {originalPrompt} and {response} to enhance and {enhancementPrompt} and returns {response1}
 * 6. User inspects {response1} and can provide another {enhancementPrompt2} to enhance it further
 * 6. {response1} is sent to next selected model and {enhancementPrompt2} and returns {response2}
 * 6. Process repeats until user decides to finish the session
 * 
 * KEY FEATURES:
 * - Manual model selection between each pass (no automatic processing)
 * - Modular prompt system integration (no hardcoded prompts)
 * - Complex management of {originalPrompt}, {response}, {enhancementPrompt}, {response1}, {enhancementPrompt2}, {response2}, etc.
 * - Copy and session management controls
 * 
 * Like a writing workshop where each AI model takes turns enhancing the work,
 * but the user controls who goes next and when to stop.
 * 
 * Author: Claude Code with Claude 4 Sonnet Thinking
 * Date: August 17, 2025
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Loader2, Brain, Edit3, Settings, Palette, Clock } from "lucide-react";
import type { AIModel, ModelResponse } from "@/types/ai-models";
import { ModelButton } from "@/components/ModelButton";
import { MessageCard, type MessageCardData } from "@/components/MessageCard";
import { ExportButton } from "@/components/ExportButton";
import { AppNavigation } from "@/components/AppNavigation";
import { parseCreativePromptsFromMarkdown, type PromptCategory, findPromptTemplate } from "@/lib/promptParser";

// Enhanced Pass interface to track the complex workflow
interface CreativePass {
  id: string;
  modelName: string;
  modelId: string;
  content: string;
  reasoning?: string;
  passNumber: number;
  responseTime: number;
  cost?: {
    input: number;
    output: number;
    total: number;
  };
  tokenUsage?: {
    input: number;
    output: number;
  };
  timestamp: Date;
  isOriginal: boolean;
  promptUsed: string; // The actual prompt sent to the model
  enhancementPrompt?: string; // The enhancement prompt if not original
}

// Workflow state management
interface WorkflowState {
  originalPrompt: string;
  currentResponse: string;
  selectedCategory: string;
  selectedModels: string[];
  passes: CreativePass[];
  isProcessing: boolean;
  awaitingNextEditor: boolean;
  awaitingFirstModel: boolean; // New state for initial model selection
  sessionStartTime: Date | null;
  totalCost: number;
}

export default function CreativeCombat() {
  const { toast } = useToast();

  // Workflow state managed locally for this page
  const [workflow, setWorkflow] = useState<WorkflowState>({
    originalPrompt: '',
    currentResponse: '',
    selectedCategory: '',
    selectedModels: [],
    passes: [],
    isProcessing: false,
    awaitingNextEditor: false,
    awaitingFirstModel: false,
    sessionStartTime: null,
    totalCost: 0,
  });

  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [customEnhancementPrompt, setCustomEnhancementPrompt] = useState('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Load available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json();
    },
  });

  // Group models by provider with strong typing (after models is declared)
  const groupedModels = useMemo(() => {
    return (models as AIModel[]).reduce<Record<string, AIModel[]>>((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    }, {});
  }, [models]);

  // Per-model response mutation (same API used by Compare page)
  const modelResponseMutation = useMutation<
    { modelId: string; response: ModelResponse },
    Error,
    { prompt: string; modelId: string }
  >({
    mutationFn: async (data: { prompt: string; modelId: string }) => {
      const response = await apiRequest('POST', '/api/models/respond', data);
      const body = await response.json() as ModelResponse;
      return { modelId: data.modelId, response: body };
    },
    onSuccess: ({ modelId, response }) => {
      const model = models.find((m: AIModel) => m.id === modelId);
      const pass: CreativePass = {
        id: `${modelId}-${Date.now()}`,
        modelName: model?.name || modelId,
        modelId,
        content: response.content,
        reasoning: response.reasoning,
        passNumber: (workflow.passes[workflow.passes.length - 1]?.passNumber || 0) + 1,
        responseTime: response.responseTime,
        cost: response.cost,
        tokenUsage: response.tokenUsage,
        timestamp: new Date(),
        isOriginal: workflow.passes.length === 0,
        promptUsed: '',
      };

      setWorkflow(prev => ({
        ...prev,
        passes: [...prev.passes, pass],
        currentResponse: response.content,
        isProcessing: false,
        awaitingNextEditor: true,
        totalCost: prev.totalCost + (response.cost?.total || 0),
        awaitingFirstModel: false,
      }));

      toast({
        title: "Creative Pass Complete",
        description: workflow.passes.length === 0 ? 'Original content created' : 'Content enhanced',
      });
    },
    onError: (error: any) => {
      setWorkflow(prev => ({ ...prev, isProcessing: false }));
      toast({ title: 'Creative Pass Failed', description: error.message, variant: 'destructive' });
    }
  });

  // Load Creative Combat prompt templates using the modular prompt parser
  useEffect(() => {
    const loadCreativePrompts = async () => {
      setPromptsLoading(true);
      try {
        const categories = await parseCreativePromptsFromMarkdown();
        setPromptCategories(categories);
      } catch (error) {
        console.error('Failed to load creative combat prompts:', error);
        toast({
          title: 'Failed to load creative prompts',
          description: 'Using fallback prompt system.',
          variant: 'destructive',
        });
      } finally {
        setPromptsLoading(false);
      }
    };
    loadCreativePrompts();
  }, [toast]);


  // Toggle model selection
  const toggleModel = (modelId: string) => {
    setWorkflow(prev => ({
      ...prev,
      selectedModels: prev.selectedModels.includes(modelId)
        ? prev.selectedModels.filter(id => id !== modelId)
        : [...prev.selectedModels, modelId]
    }));
  };

  // Start the creative session with original prompt
  const startCreativeSession = () => {
    if (!workflow.originalPrompt.trim()) {
      toast({
        title: "No Prompt",
        description: "Please enter a creative prompt to begin",
        variant: "destructive",
      });
      return;
    }

    if (workflow.selectedModels.length === 0) {
      toast({
        title: "No Models Selected",
        description: "Please select at least one model for the creative session",
        variant: "destructive",
      });
      return;
    }

    if (!workflow.selectedCategory) {
      toast({
        title: "No Category Selected", 
        description: "Please select a creative category",
        variant: "destructive",
      });
      return;
    }

    // Get the original prompt template
    const originalTemplate = findPromptTemplate(promptCategories, workflow.selectedCategory, 'original-prompt');
    if (!originalTemplate) {
      toast({
        title: "Template Not Found",
        description: "Could not find original prompt template for selected category",
        variant: "destructive",
      });
      return;
    }
    
    setWorkflow(prev => ({
      ...prev,
      passes: [],
      sessionStartTime: new Date(),
      totalCost: 0,
      awaitingNextEditor: false,
      awaitingFirstModel: true,
      isProcessing: false
    }));

    toast({
      title: "Select First Model",
      description: "Choose which model should create the original content",
    });
  };

  // Process a creative pass (original or enhancement)
  const processCreativePass = (modelId: string, isOriginal: boolean, enhancementPrompt?: string) => {
    const model = models.find((m: AIModel) => m.id === modelId);
    if (!model) return;

    setWorkflow(prev => ({ 
      ...prev, 
      isProcessing: true,
      awaitingFirstModel: false,
      awaitingNextEditor: false
    }));

    let finalPrompt: string;
    
    if (isOriginal) {
      // Original prompt
      const originalTemplate = findPromptTemplate(promptCategories, workflow.selectedCategory, 'original-prompt');
      finalPrompt = `${originalTemplate?.content || ''}\n\nUser's creative prompt: ${workflow.originalPrompt}`;
    } else {
      // Enhancement prompt
      const enhancementTemplate = findPromptTemplate(promptCategories, workflow.selectedCategory, 'enhancement-prompt');
      let templatePrompt = enhancementTemplate?.content || '';
      
      // Replace placeholders
      templatePrompt = templatePrompt.replace('{response}', workflow.currentResponse);
      templatePrompt = templatePrompt.replace('{originalPrompt}', workflow.originalPrompt);
      
      finalPrompt = enhancementPrompt ? `${templatePrompt}\n\nAdditional enhancement instructions: ${enhancementPrompt}` : templatePrompt;
    }

    // Use the React Query mutation
    modelResponseMutation.mutate({ prompt: finalPrompt, modelId });
  };

  // Continue with next enhancement
  const continueWithNextModel = (modelId: string, enhancementPrompt: string) => {
    processCreativePass(modelId, false, enhancementPrompt);
    setCustomEnhancementPrompt('');
  };

  // Reset session
  const resetSession = () => {
    setWorkflow({
      originalPrompt: '',
      currentResponse: '',
      selectedCategory: '',
      selectedModels: [],
      passes: [],
      isProcessing: false,
      awaitingNextEditor: false,
      awaitingFirstModel: false,
      sessionStartTime: null,
      totalCost: 0
    });
    setCustomEnhancementPrompt('');
  };



  // Convert CreativePass to MessageCardData for display
  const convertPassToMessageData = (pass: CreativePass): MessageCardData => ({
    id: pass.id,
    modelName: pass.modelName,
    modelId: pass.modelId,
    content: pass.content,
    reasoning: pass.reasoning,
    responseTime: pass.responseTime,
    timestamp: pass.timestamp,
    type: pass.isOriginal ? 'initial' : 'creative',
    tokenUsage: pass.tokenUsage,
    cost: pass.cost,
    modelConfig: pass.cost ? {
      capabilities: {
        reasoning: !!pass.reasoning,
        multimodal: false,
        functionCalling: false,
        streaming: false
      },
      pricing: {
        inputPerMillion: 0,
        outputPerMillion: 0
      }
    } : undefined
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="Creative Combat" 
        subtitle="Sequential creative editing with AI models"
        icon={Palette}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Session Stats Header */}
        {workflow.passes.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="default">Creative Session Active</Badge>
                  <Badge variant="outline">{workflow.passes.length} passes</Badge>
                  {workflow.sessionStartTime && (
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {Math.round((Date.now() - workflow.sessionStartTime.getTime()) / 1000)}s
                    </Badge>
                  )}
                  <Badge variant="outline">${workflow.totalCost.toFixed(4)}</Badge>
                </div>
                <div className="flex gap-2">
                  <ExportButton
                    responses={workflow.passes.reduce((acc, pass) => ({
                      ...acc,
                      [pass.modelId]: {
                        status: 'success' as const,
                        content: pass.content,
                        reasoning: pass.reasoning,
                        responseTime: pass.responseTime,
                        tokenUsage: pass.tokenUsage,
                        cost: pass.cost
                      }
                    }), {})}
                    models={models}
                    prompt={workflow.originalPrompt}
                    variant="comparison"
                  />
                  <Button onClick={resetSession} variant="outline" size="sm">
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Basic Setup */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Creative Category</Label>
                  <Select value={workflow.selectedCategory} onValueChange={(value) => setWorkflow(prev => ({ ...prev, selectedCategory: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {promptCategories.map((cat: PromptCategory) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Original Prompt Input */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Original Creative Prompt</Label>
                  <Textarea
                    value={workflow.originalPrompt}
                    onChange={(e) => setWorkflow(prev => ({ ...prev, originalPrompt: e.target.value }))}
                    placeholder="Enter your creative challenge..."
                    className="min-h-24 text-sm"
                    rows={4}
                  />
                </div>

                {/* Start Session Button */}
                <Button
                  onClick={startCreativeSession}
                  disabled={workflow.isProcessing || workflow.awaitingFirstModel || workflow.awaitingNextEditor || !workflow.originalPrompt.trim() || !workflow.selectedCategory || workflow.selectedModels.length === 0}
                  className="w-full"
                >
                  {workflow.isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : workflow.awaitingFirstModel ? (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Select First Model Below
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Creative Session
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Model Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>Available Models</span>
                  <Badge variant="outline">{workflow.selectedModels.length} selected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workflow.awaitingFirstModel ? (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Click a model below to start the creative session with that model.
                    </p>
                  </div>
                ) : null}
                
                {modelsLoading ? (
                  <div className="grid grid-cols-1 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Provider Groups */}
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <div key={provider} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {provider}
                          </h3>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const providerModelIds = (providerModels as AIModel[]).map((m) => m.id);
                                const allSelected = providerModelIds.every((id) => workflow.selectedModels.includes(id));
                                if (allSelected) {
                                  setWorkflow(prev => ({ 
                                    ...prev, 
                                    selectedModels: prev.selectedModels.filter(id => !providerModelIds.includes(id)) 
                                  }));
                                } else {
                                  setWorkflow(prev => ({ 
                                    ...prev, 
                                    selectedModels: Array.from(new Set([...prev.selectedModels, ...providerModelIds])) 
                                  }));
                                }
                              }}
                              className="text-xs h-6 px-2"
                            >
                              {(providerModels as AIModel[]).every((model) => workflow.selectedModels.includes(model.id)) ? 'None' : 'All'}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {(providerModels as AIModel[]).map((model) => (
                            <ModelButton
                              key={model.id}
                              model={model}
                              isSelected={workflow.selectedModels.includes(model.id)}
                              isAnalyzing={workflow.isProcessing && modelResponseMutation.variables?.modelId === model.id}
                              responseCount={workflow.passes.filter(pass => pass.modelId === model.id).length}
                              onToggle={(modelId) => {
                                if (workflow.awaitingFirstModel) {
                                  // Start with first model
                                  processCreativePass(modelId, true);
                                } else {
                                  // Normal toggle for selection
                                  toggleModel(modelId);
                                }
                              }}
                              disabled={workflow.isProcessing || (workflow.awaitingFirstModel && !workflow.selectedModels.includes(model.id))}
                              showTiming={false}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Quick Actions */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWorkflow(prev => ({ ...prev, selectedModels: (models as AIModel[]).map((m: AIModel) => m.id) }))}
                          disabled={workflow.selectedModels.length === models.length}
                          className="text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWorkflow(prev => ({ ...prev, selectedModels: [] }))}
                          disabled={workflow.selectedModels.length === 0}
                          className="text-xs"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Creative Evolution Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Creative Evolution</span>
              {workflow.isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workflow.passes.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Palette className="w-8 h-8" />
                </div>
                <p>Start a creative session to see AI models collaborate on enhancing your work</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Creative Passes using MessageCard */}
                {workflow.passes.map((pass) => (
                  <MessageCard
                    key={pass.id}
                    message={convertPassToMessageData(pass)}
                    variant="compact"
                  />
                ))}

                {/* Next Enhancement Controls */}
                {workflow.awaitingNextEditor && !workflow.isProcessing && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Edit3 className="w-4 h-4" />
                        <span>Choose Next Enhancement</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Custom Enhancement Instructions (optional)</Label>
                        <Textarea
                          value={customEnhancementPrompt}
                          onChange={(e) => setCustomEnhancementPrompt(e.target.value)}
                          placeholder="Add specific enhancement instructions or leave blank to use default template..."
                          rows={3}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {workflow.selectedModels.map((modelId) => {
                          const model = models.find((m: AIModel) => m.id === modelId);
                          if (!model) return null;
                          return (
                            <Button
                              key={modelId}
                              variant="outline"
                              className="justify-start h-auto p-3"
                              onClick={() => continueWithNextModel(modelId, customEnhancementPrompt)}
                              disabled={workflow.isProcessing}
                            >
                              <div className="flex flex-col items-start w-full">
                                <span className="font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">{model.provider}</span>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {workflow.passes.filter(p => p.modelId === model.id).length} passes
                                </Badge>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <Button
                          variant="ghost"
                          onClick={() => setWorkflow(prev => ({ ...prev, awaitingNextEditor: false }))}
                        >
                          Finish Session
                        </Button>
                        <ExportButton
                          responses={workflow.passes.reduce((acc, pass) => ({
                            ...acc,
                            [pass.modelId]: {
                              status: 'success' as const,
                              content: pass.content,
                              reasoning: pass.reasoning,
                              responseTime: pass.responseTime,
                              tokenUsage: pass.tokenUsage,
                              cost: pass.cost
                            }
                          }), {})}
                          models={models}
                          prompt={workflow.originalPrompt}
                          variant="comparison"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}