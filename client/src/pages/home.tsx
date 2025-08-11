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
import { Moon, Sun, Send, MessageSquare, Brain, Zap, Settings, Sword, Palette } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";
import { ResponseCard } from "@/components/ResponseCard";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError, isInsufficientCreditsError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { UserMenu } from "@/components/UserMenu";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import type { AIModel, ModelResponse, ComparisonResult } from "@/types/ai-models";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [prompt, setPrompt] = useState(`• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "openai-gpt-5",
    "anthropic-claude-sonnet-4", 
    "gemini-2.5-pro",
    "deepseek-reasoner"
  ]);
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

  // Individual model response mutation for incremental rendering
  const modelResponseMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelId: string }) => {
      const response = await apiRequest('POST', '/api/models/respond', data);
      return { modelId: data.modelId, response: await response.json() as ModelResponse };
    },
    onSuccess: (data) => {
      setResponses(prev => ({ ...prev, [data.modelId]: data.response }));
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
    onError: (error: any, variables) => {
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.modelId);
        return newSet;
      });
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue. Redirecting...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      
      if (isInsufficientCreditsError(error)) {
        toast({
          title: "Insufficient Credits",
          description: "You need more credits to use AI models. Purchase more credits to continue.",
          variant: "destructive",
        });
        return;
      }
      
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

  const retryModel = (modelId: string) => {
    // Add model back to loading state
    setLoadingModels(prev => new Set([...Array.from(prev), modelId]));
    setCompletedModels(prev => {
      const newSet = new Set(prev);
      newSet.delete(modelId);
      return newSet;
    });
    
    // Remove any existing response
    setResponses(prev => {
      const newResponses = { ...prev };
      delete newResponses[modelId];
      return newResponses;
    });

    // Retry the single model
    modelResponseMutation.mutate({ prompt, modelId });
  };

  const selectedModelData = models.filter(model => selectedModels.includes(model.id));

  // Show landing page for non-authenticated users
  if (!authLoading && !isAuthenticated) {
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="p-2"
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </Button>
                <Button onClick={() => window.location.href = '/api/login'}>
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Landing Page Content */}
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Compare AI Models Side-by-Side
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Test and compare responses from multiple AI models including GPT-5, Claude 4, Gemini, and more.
            Get detailed insights into their capabilities and performance.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multiple AI Models</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Compare responses from OpenAI, Anthropic, Google, DeepSeek, and xAI models
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Credit System</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start with 500 free credits. Each model call costs just 5 credits.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <MessageSquare className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Battle Modes</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Watch models debate each other in interactive battle and debate modes
              </p>
            </div>
          </div>

          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="px-8 py-3 text-lg"
          >
            Get Started with Google Sign-In
          </Button>
        </div>
      </div>
    );
  }

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
              {isAuthenticated && (
                <>
                  <CreditsDisplay onPurchaseClick={() => window.location.href = '/checkout'} />
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
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>
              <UserMenu />
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
