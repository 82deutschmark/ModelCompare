/**
 * Home Page Component - AI Model Comparison Interface
 * 
 * This is the main application page that provides the user interface for comparing
 * AI model responses. It manages the entire comparison workflow including:
 * - Model selection from multiple AI providers (OpenAI, Anthropic, Gemini, DeepSeek, xAI)
 * - Prompt input with validation and character counting
 * - Parallel API calls to selected models for response comparison
 * - Real-time display of responses in a grid layout with loading states
 * - Error handling and retry functionality for failed requests
 * - Theme switching between light and dark modes
 * 
 * The component uses TanStack Query for server state management and provides
 * a clean, modern interface for side-by-side AI model comparison.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, Send, MessageSquare, Brain, Zap, Settings, Sword, Palette, BookOpen } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";
import { ResponseCard } from "@/components/ResponseCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parsePromptsFromMarkdown, type PromptCategory, type PromptTemplate } from "@/lib/promptParser";
import { Link } from "wouter";
import type { AIModel, ModelResponse, ComparisonResult } from "@/types/ai-models";



export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [prompt, setPrompt] = useState(`• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({});
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set());
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());
  const [streamResponses, setStreamResponses] = useState(false);
  const [showTiming, setShowTiming] = useState(true);

  // Fetch available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Load prompt templates from markdown on component mount
  useEffect(() => {
    const loadPrompts = async () => {
      setPromptsLoading(true);
      try {
        const categories = await parsePromptsFromMarkdown();
        setPromptCategories(categories);
      } catch (error) {
        console.error('Failed to load prompt templates:', error);
        toast({
          title: 'Failed to load prompt templates',
          description: 'Using default prompt input only.',
          variant: 'destructive',
        });
      } finally {
        setPromptsLoading(false);
      }
    };

    loadPrompts();
  }, [toast]);

  // Individual model response mutation for incremental rendering
  const modelResponseMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelId: string }) => {
      const response = await apiRequest('POST', '/api/models/respond', data);
      const responseData = await response.json() as ModelResponse;
      return { modelId: data.modelId, response: responseData };
    },
    onSuccess: (data) => {
      // Add missing status field that ResponseCard expects
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
        description: `Response received in ${(data.response.responseTime / 1000).toFixed(1)}s`,
      });
    },
    onError: (error, variables) => {
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.modelId);
        return newSet;
      });
      
      // Set error response with proper status field
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
        description: "Please enter a prompt to compare models.",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "Select models",
        description: "Please select at least one model to compare.",
        variant: "destructive",
      });
      return;
    }

    // Reset state for new comparison
    setResponses({});
    setLoadingModels(new Set(selectedModels));
    setCompletedModels(new Set());
    
    // Start all model requests in parallel for incremental rendering
    selectedModels.forEach(modelId => {
      modelResponseMutation.mutate({ prompt, modelId });
    });
    
    toast({
      title: "Comparison Started",
      description: `Requesting responses from ${selectedModels.length} models...`,
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
    
    // Clear previous response
    setResponses(prev => {
      const newResponses = { ...prev };
      delete newResponses[modelId];
      return newResponses;
    });
    
    modelResponseMutation.mutate({ prompt, modelId });
  };

  // Prompt template handlers
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPromptTemplate(''); // Reset prompt selection when category changes
  };

  const handlePromptTemplateChange = (promptId: string) => {
    setSelectedPromptTemplate(promptId);
    const category = promptCategories.find(cat => cat.id === selectedCategory);
    const selectedPrompt = category?.prompts.find(p => p.id === promptId);
    if (selectedPrompt) {
      setPrompt(selectedPrompt.content);
      toast({
        title: 'Prompt Template Applied',
        description: `Applied "${selectedPrompt.name}" template`,
      });
    }
  };

  const clearPromptSelection = () => {
    setSelectedCategory('');
    setSelectedPromptTemplate('');
  };

  // Get available prompts for selected category
  const availablePrompts = selectedCategory 
    ? promptCategories.find(cat => cat.id === selectedCategory)?.prompts || []
    : [];

  const selectedModelData = models.filter(model => selectedModels.includes(model.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Model Comparison</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/battle">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Sword className="w-4 h-4" />
                  <span>Battle Mode</span>
                </Button>
              </Link>
              <Link href="/creative-combat">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Palette className="w-4 h-4" />
                  <span>Creative Combat</span>
                </Button>
              </Link>
              <Link href="/debate">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Debate Mode</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Model Selection Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Select Models</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {modelsLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                  </div>
                ) : (
                  <ModelSelector
                    models={models}
                    selectedModels={selectedModels}
                    onSelectionChange={setSelectedModels}
                  />
                )}
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
                  </div>
                  
                  <div className="space-y-3">
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Prompt Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Enter Your Prompt</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt Templates Section */}
                {!promptsLoading && promptCategories.length > 0 && (
                  <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Templates</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Category Selection */}
                      <Select value={selectedCategory} onValueChange={handleCategoryChange}>
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
                      
                      {/* Prompt Selection */}
                      <Select 
                        value={selectedPromptTemplate} 
                        onValueChange={handlePromptTemplateChange}
                        disabled={!selectedCategory}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select prompt..." />
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
                    
                    {/* Clear Selection Button */}
                    {(selectedCategory || selectedPromptTemplate) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearPromptSelection}
                        className="w-full"
                      >
                        Clear Selection & Use Custom Prompt
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="min-h-20 pr-16"
                    placeholder="Ask a question or provide a prompt to compare across selected AI models..."
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {prompt.length}/4000
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedModels.length === 0 ? (
                      "Select models to start comparing"
                    ) : (
                      `Ready to compare with ${selectedModels.length} model${selectedModels.length !== 1 ? 's' : ''}`
                    )}
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={loadingModels.size > 0 || !prompt.trim() || selectedModels.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {loadingModels.size > 0 ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Comparing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Compare Models
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Grid */}
            {selectedModelData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Models Selected</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select some models from the panel on the left to start comparing AI responses.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {selectedModelData.map((model) => (
                  <ResponseCard
                    key={model.id}
                    model={model}
                    response={responses[model.id]}
                    onRetry={() => retryModel(model.id)}
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
