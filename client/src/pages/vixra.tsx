/**
 * Vixra Mode Page - Satirical AI-Generated Research Papers
 * 
 * This page provides a specialized interface for generating satirical academic papers
 * using AI models. It follows the same pattern as the home page but with Vixra-specific
 * prompt templates for creating humorous research papers.
 * 
 * Author: Cascade
 * Date: January 2025
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Zap, BookOpen, Eye } from "lucide-react";
import { ModelButton } from "@/components/ModelButton";
import { ResponseCard } from "@/components/ResponseCard";
import { AppNavigation } from "@/components/AppNavigation";
import { ExportButton } from "@/components/ExportButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parsePromptsFromMarkdownFile, type PromptCategory } from "@/lib/promptParser";
import type { AIModel, ModelResponse } from "@/types/ai-models";

export default function VixraPage() {
  const { toast } = useToast();
  
  const defaultPrompt = `Write a satirical academic paper about the relationship between caffeine consumption and developer productivity. Include:
• An abstract with overblown claims
• Methodology involving questionable data sources
• Statistical analysis that proves correlation equals causation
• A conclusion that coffee is the fundamental force driving technological progress`;
  
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isDefaultPrompt, setIsDefaultPrompt] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({});
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set());
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());
  const [showTiming, setShowTiming] = useState(true);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

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
        // Parse the markdown from the vixra-specific prompts file using the standard parser
        const categories = await parsePromptsFromMarkdownFile('/docs/vixra-prompts.md');
        setPromptCategories(categories);
      } catch (error) {
        console.error('Failed to load Vixra prompt templates:', error);
        toast({
          title: 'Failed to load Vixra templates',
          description: 'Using default prompt input only.',
          variant: 'destructive',
        });
      } finally {
        setPromptsLoading(false);
      }
    };

    loadVixraPrompts();
  }, [toast]);

  // Individual model response mutation (same as home page)
  const modelResponseMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelId: string }) => {
      const response = await apiRequest('POST', '/api/models/respond', data);
      const responseData = await response.json() as ModelResponse;
      return { modelId: data.modelId, response: responseData };
    },
    onSuccess: (data) => {
      const responseWithStatus = { ...data.response, status: 'success' as const };
      setResponses(prev => ({ ...prev, [data.modelId]: responseWithStatus }));
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.modelId);
        return newSet;
      });
      setCompletedModels(prev => new Set([...Array.from(prev), data.modelId]));
      
      const model = models.find(m => m.id === data.modelId);
      toast({
        title: `${model?.name || 'Model'} Responded`,
        description: `Satirical paper generated in ${(data.response.responseTime / 1000).toFixed(1)}s`,
      });
    },
    onError: (error, variables) => {
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.modelId);
        return newSet;
      });
      
      setResponses(prev => ({
        ...prev,
        [variables.modelId]: {
          content: '',
          status: 'error' as const,
          responseTime: 0,
          error: error.message
        }
      }));
      
      const model = models.find(m => m.id === variables.modelId);
      toast({
        title: `${model?.name || 'Model'} Failed`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please enter a prompt for your satirical paper.",
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

    // Reset state for new generation
    setResponses({});
    setLoadingModels(new Set(selectedModels));
    setCompletedModels(new Set());
    
    // Start all model requests in parallel
    selectedModels.forEach(modelId => {
      modelResponseMutation.mutate({ prompt, modelId });
    });
    
    toast({
      title: "Paper Generation Started",
      description: `Generating satirical papers with ${selectedModels.length} models...`,
    });
  };

  const retryModel = async (modelId: string) => {
    if (!prompt.trim()) return;
    
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
    
    modelResponseMutation.mutate({ prompt, modelId });
  };

  // Prompt template handlers (same as home page)
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPromptTemplate('');
  };

  const handlePromptTemplateChange = (promptId: string) => {
    setSelectedPromptTemplate(promptId);
    const category = promptCategories.find(cat => cat.id === selectedCategory);
    const selectedPrompt = category?.prompts.find(p => p.id === promptId);
    if (selectedPrompt) {
      setPrompt(selectedPrompt.content);
      setIsDefaultPrompt(false);
      toast({
        title: 'Vixra Template Applied',
        description: `Applied "${selectedPrompt.name}" template`,
      });
    }
  };

  const clearPromptSelection = () => {
    setSelectedCategory('');
    setSelectedPromptTemplate('');
    setPrompt(defaultPrompt);
    setIsDefaultPrompt(true);
  };

  const availablePrompts = selectedCategory 
    ? promptCategories.find(cat => cat.id === selectedCategory)?.prompts || []
    : [];

  const selectedModelData = models.filter(model => selectedModels.includes(model.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="Vixra Mode" 
        subtitle="Generate satirical academic papers"
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
            {/* Prompt Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>Paper Topic & Requirements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Vixra Templates Section */}
                {!promptsLoading && promptCategories.length > 0 && (
                  <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Vixra Templates</Label>
                    </div>
                    
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
                    
                    {(selectedCategory || selectedPromptTemplate) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearPromptSelection}
                        className="w-full"
                      >
                        Clear Selection & Use Custom Topic
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 4000) {
                        setPrompt(value);
                        setIsDefaultPrompt(value === defaultPrompt);
                      }
                    }}
                    onFocus={() => {
                      if (isDefaultPrompt) {
                        setPrompt('');
                        setIsDefaultPrompt(false);
                      }
                    }}
                    rows={12}
                    className={`min-h-48 pr-16 resize-none ${isDefaultPrompt ? 'text-gray-300 dark:text-gray-600' : ''}`}
                    placeholder="Describe the topic for your satirical academic paper..."
                    maxLength={4000}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {prompt.length}/4000
                  </div>
                </div>
                
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
                      {showPromptPreview ? 'Hide' : 'Show'} Raw Prompt
                    </Button>
                    <ExportButton
                      prompt={prompt}
                      models={selectedModelData}
                      responses={responses}
                      disabled={loadingModels.size > 0}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={loadingModels.size > 0 || !prompt.trim() || selectedModels.length === 0}
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

            {/* Raw Prompt Preview */}
            {showPromptPreview && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>Raw Prompt Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {prompt || 'No prompt entered'}
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
