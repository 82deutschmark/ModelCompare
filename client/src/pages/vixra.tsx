/**
 * Vixra Mode Page - Satirical AI-Generated Research Papers
 * 
 * This page provides a specialized interface for generating satirical academic papers
 * using AI models with proper variable substitution and validation. It follows the
 * project's modular architecture and uses the unified /api/generate endpoint.
 * 
 * Author: Claude (updated to use unified variable system)
 * Date: January 2025
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Zap, BookOpen, Eye, Settings } from "lucide-react";
import { ModelButton } from "@/components/ModelButton";
import { MessageCard, type MessageCardData } from "@/components/MessageCard";
import { AppNavigation } from "@/components/AppNavigation";
import { ExportButton } from "@/components/ExportButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parsePromptsFromMarkdownFile, type PromptCategory } from "@/lib/promptParser";
import { VARIABLE_REGISTRIES, getDefaultVariables } from "../../../shared/variable-registry";
import type { GenerateRequest, GenerateResponse, ModelSeat, UnifiedMessage } from "../../../shared/api-types";
import type { AIModel } from "@/types/ai-models";

const SCIENCE_CATEGORIES = VARIABLE_REGISTRIES.vixra.find(v => v.name === 'ScienceCategory')?.enum || [];

export default function VixraPage() {
  const { toast } = useToast();
  
  // State for variables
  const [variables, setVariables] = useState<Record<string, string>>(() => ({
    ...getDefaultVariables('vixra'),
    ResearcherName: 'Dr. Pseudo Science',
    ScienceCategory: SCIENCE_CATEGORIES[0] || '',
    Title: 'Revolutionary Breakthrough in Quantum Coffee Dynamics',
    Authors: 'Dr. Pseudo Science, Prof. Mock Academia',
    PromptMode: 'template'
  }));
  
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [currentTemplate, setCurrentTemplate] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, UnifiedMessage>>({});
  
  // Convert UnifiedMessage to MessageCardData format
  const getMessageCardData = (modelId: string, message: UnifiedMessage | undefined, model: AIModel): MessageCardData | undefined => {
    if (!message) return undefined;
    
    return {
      id: message.id,
      modelName: model.name,
      modelId: model.id,
      content: message.content,
      reasoning: message.reasoning,
      responseTime: 0, // Not tracked in UnifiedMessage
      tokenUsage: message.tokenUsage,
      cost: message.cost,
      timestamp: new Date(message.createdAt).getTime()
    };
  };
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set());
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());
  const [showTiming, setShowTiming] = useState(true);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [showVariablesPanel, setShowVariablesPanel] = useState(true);

  // Fetch available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Load Vixra prompt templates from markdown
  useEffect(() => {
    const loadVixraPrompts = async () => {
      setPromptsLoading(true);
      try {
        const categories = await parsePromptsFromMarkdownFile('/docs/vixra-prompts.md');
        setPromptCategories(categories);
        if (categories.length > 0) {
          const firstCategory = categories[0];
          setSelectedCategory(firstCategory.id);
          if (firstCategory.prompts.length > 0) {
            const firstPrompt = firstCategory.prompts[0];
            setSelectedPromptTemplate(firstPrompt.id);
            setCurrentTemplate(firstPrompt.content);
          }
        }
      } catch (error) {
        console.error('Failed to load Vixra prompt templates:', error);
        toast({
          title: 'Failed to load Vixra templates',
          description: 'Using default template.',
          variant: 'destructive',
        });
        setCurrentTemplate('Generate a satirical academic paper about {Title} in the category {ScienceCategory} by {Authors}.');
      } finally {
        setPromptsLoading(false);
      }
    };

    loadVixraPrompts();
  }, [toast]);

  // Unified generation mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { template: string; variables: Record<string, string>; seats: ModelSeat[] }) => {
      const request: GenerateRequest = {
        mode: 'vixra',
        template: data.template,
        variables: data.variables,
        messages: [],
        seats: data.seats,
        options: { stream: false }
      };
      
      const response = await apiRequest('POST', '/api/generate', request);
      return response.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data, variables) => {
      const seatId = variables.seats[0].id;
      setResponses(prev => ({ ...prev, [seatId]: data.message }));
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(seatId);
        return newSet;
      });
      setCompletedModels(prev => new Set([...Array.from(prev), seatId]));
      
      toast({
        title: 'Paper Generated',
        description: `Generated in ${(data.message.tokenUsage?.input || 0) + (data.message.tokenUsage?.output || 0)} tokens`,
      });
    },
    onError: (error, variables) => {
      const seatId = variables.seats[0].id;
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(seatId);
        return newSet;
      });
      
      setResponses(prev => ({
        ...prev,
        [seatId]: {
          id: `error-${Date.now()}`,
          role: 'assistant' as const,
          content: '',
          createdAt: new Date().toISOString(),
          status: 'error' as const,
          finishReason: 'error' as const
        }
      }));
      
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!currentTemplate.trim()) {
      toast({
        title: "No template selected",
        description: "Please select a prompt template.",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "Select models",
        description: "Please select at least one model to generate papers.",
        variant: "destructive",
      });
      return;
    }

    // Validate required variables
    const registry = VARIABLE_REGISTRIES.vixra;
    const missingRequired = registry
      .filter(schema => schema.required && (!variables[schema.name] || variables[schema.name].trim() === ''))
      .map(schema => schema.name);
      
    if (missingRequired.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingRequired.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Reset state for new generation
    setResponses({});
    setLoadingModels(new Set(selectedModels));
    setCompletedModels(new Set());
    
    // Start generation for each model
    selectedModels.forEach(modelId => {
      const model = models.find(m => m.id === modelId);
      if (!model) return;
      
      const seat: ModelSeat = {
        id: modelId,
        model: {
          id: model.id,
          name: model.name,
          provider: model.provider
        }
      };
      
      generateMutation.mutate({ 
        template: currentTemplate, 
        variables, 
        seats: [seat] 
      });
    });
    
    toast({
      title: "Paper Generation Started",
      description: `Generating satirical papers with ${selectedModels.length} models...`,
    });
  };

  const retryModel = async (modelId: string) => {
    if (!currentTemplate.trim()) return;
    
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    
    setLoadingModels(prev => new Set([...Array.from(prev), modelId]));
    setCompletedModels(prev => {
      const newSet = new Set(prev);
      newSet.delete(modelId);
      return newSet;
    });
    
    setResponses(prev => {
      const newResponses = { ...prev };
      delete newResponses[modelId];
      return newResponses;
    });
    
    const seat: ModelSeat = {
      id: modelId,
      model: {
        id: model.id,
        name: model.name,
        provider: model.provider
      }
    };
    
    generateMutation.mutate({ 
      template: currentTemplate, 
      variables, 
      seats: [seat] 
    });
  };

  // Prompt template handlers
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPromptTemplate('');
  };

  const handlePromptTemplateChange = (promptId: string) => {
    setSelectedPromptTemplate(promptId);
    const category = promptCategories.find(cat => cat.id === selectedCategory);
    const selectedPrompt = category?.prompts.find(p => p.id === promptId);
    if (selectedPrompt) {
      setCurrentTemplate(selectedPrompt.content);
      toast({
        title: 'Vixra Template Applied',
        description: `Applied "${selectedPrompt.name}" template`,
      });
    }
  };

  const availablePrompts = selectedCategory 
    ? promptCategories.find(cat => cat.id === selectedCategory)?.prompts || []
    : [];

  const selectedModelData = models.filter(model => selectedModels.includes(model.id));

  const updateVariable = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="Vixra Mode" 
        subtitle="Generate satirical academic papers with variable substitution"
        icon={FileText}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Model Selection Panel */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <span>AI Models</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedModels.length} selected
                  </div>
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
                        if (!acc[model.provider]) acc[model.provider] = [];
                        acc[model.provider].push(model);
                        return acc;
                      }, {} as Record<string, typeof models>)
                    ).map(([provider, providerModels]) => (
                      <div key={provider} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {provider}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const providerModelIds = providerModels.map(m => m.id);
                              const allSelected = providerModelIds.every(id => selectedModels.includes(id));
                              if (allSelected) {
                                setSelectedModels(prev => prev.filter(id => !providerModelIds.includes(id)));
                              } else {
                                setSelectedModels(prev => Array.from(new Set([...prev, ...providerModelIds])));
                              }
                            }}
                            className="text-xs h-6 px-2"
                          >
                            {providerModels.every(model => selectedModels.includes(model.id)) ? 'None' : 'All'}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {providerModels.map((model) => (
                            <ModelButton
                              key={model.id}
                              model={model}
                              isSelected={selectedModels.includes(model.id)}
                              isAnalyzing={loadingModels.has(model.id)}
                              responseCount={responses[model.id] ? 1 : 0}
                              onToggle={(modelId) => {
                                setSelectedModels(prev => 
                                  prev.includes(modelId) 
                                    ? prev.filter(id => id !== modelId)
                                    : [...prev, modelId]
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
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModels(models.map(m => m.id))}
                      disabled={selectedModels.length === models.length}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModels([])}
                      disabled={selectedModels.length === 0}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timing"
                      checked={showTiming}
                      onCheckedChange={(checked) => setShowTiming(checked === true)}
                    />
                    <Label htmlFor="timing" className="text-sm">
                      Show response timing
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-4">
            {/* Template Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>Prompt Template</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {!promptsLoading && promptCategories.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={selectedCategory} 
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {promptCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={selectedPromptTemplate} 
                      onValueChange={handlePromptTemplateChange}
                      disabled={!selectedCategory}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variables Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    <Settings className="w-4 h-4" />
                    <span>Paper Variables</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                  >
                    {showVariablesPanel ? 'Hide' : 'Show'}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showVariablesPanel && (
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Required Variables */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Required Fields</Label>
                      
                      <div>
                        <Label htmlFor="researcherName" className="text-xs">Researcher Name *</Label>
                        <Input
                          id="researcherName"
                          value={variables.ResearcherName || ''}
                          onChange={(e) => updateVariable('ResearcherName', e.target.value)}
                          placeholder="Dr. Pseudo Science"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="scienceCategory" className="text-xs">Science Category *</Label>
                        <Select 
                          value={variables.ScienceCategory || ''} 
                          onValueChange={(value) => updateVariable('ScienceCategory', value)}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SCIENCE_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="title" className="text-xs">Paper Title *</Label>
                        <Input
                          id="title"
                          value={variables.Title || ''}
                          onChange={(e) => updateVariable('Title', e.target.value)}
                          placeholder="Revolutionary Breakthrough in..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="authors" className="text-xs">Authors *</Label>
                        <Input
                          id="authors"
                          value={variables.Authors || ''}
                          onChange={(e) => updateVariable('Authors', e.target.value)}
                          placeholder="Dr. Pseudo Science, Independent Researcher."
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Optional Variables */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Optional Fields</Label>
                      
                      <div>
                        <Label htmlFor="collaborators" className="text-xs">Collaborators</Label>
                        <Input
                          id="collaborators"
                          value={variables.Collaborators || ''}
                          onChange={(e) => updateVariable('Collaborators', e.target.value)}
                          placeholder="Aliens, Advanced AI, Time Travelers, Extradimensional Beings,"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-xs">Email</Label>
                        <Input
                          id="email"
                          value={variables.Email || ''}
                          onChange={(e) => updateVariable('Email', e.target.value)}
                          placeholder="researcher@example.com"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="numPages" className="text-xs">Number of Pages</Label>
                        <Input
                          id="numPages"
                          type="number"
                          value={variables.NumPages || ''}
                          onChange={(e) => updateVariable('NumPages', e.target.value)}
                          placeholder="10"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="targetSections" className="text-xs">Target Sections</Label>
                        <Input
                          id="targetSections"
                          type="number"
                          value={variables.TargetSections || '6'}
                          onChange={(e) => updateVariable('TargetSections', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="abstract" className="text-xs">Abstract (optional)</Label>
                    <Textarea
                      id="abstract"
                      value={variables.Abstract || ''}
                      onChange={(e) => updateVariable('Abstract', e.target.value)}
                      placeholder="Leave blank for auto-generation"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Controls */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedModels.length === 0 ? (
                      "Select models to generate satirical papers"
                    ) : (
                      `Ready to generate with ${selectedModels.length} model${selectedModels.length !== 1 ? 's' : ''}`
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setShowPromptPreview(!showPromptPreview)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {showPromptPreview ? 'Hide' : 'Show'} Template
                    </Button>
                    <ExportButton
                      prompt={currentTemplate}
                      models={selectedModelData}
                      responses={Object.fromEntries(
                        Object.entries(responses).map(([key, value]) => [
                          key, 
                          {
                            content: value.content,
                            status: (value.status === 'complete' ? 'success' : value.status === 'error' ? 'error' : 'loading') as 'success' | 'error' | 'loading',
                            responseTime: 0,
                            reasoning: value.reasoning,
                            tokenUsage: value.tokenUsage,
                            cost: value.cost
                          }
                        ])
                      )}
                      disabled={loadingModels.size > 0}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={loadingModels.size > 0 || !currentTemplate.trim() || selectedModels.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                      size="sm"
                    >
                      {loadingModels.size > 0 ? (
                        <>
                          <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="text-sm">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          <span className="text-sm">Generate Papers</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Template Preview */}
            {showPromptPreview && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>Template Preview (with variables)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {currentTemplate || 'No template selected'}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {selectedModelData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">No Models Selected</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select some models to start generating satirical papers.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {selectedModelData.map((model) => {
                  const messageData = getMessageCardData(model.id, responses[model.id], model);
                  
                  if (!messageData && !loadingModels.has(model.id)) {
                    return null; // No message and not loading
                  }
                  
                  if (loadingModels.has(model.id)) {
                    // Show loading state
                    return (
                      <Card key={model.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Generating paper with {model.name}...
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  return (
                    <MessageCard
                      key={model.id}
                      message={messageData!}
                      variant="detailed"
                      showHeader={true}
                      showFooter={true}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}