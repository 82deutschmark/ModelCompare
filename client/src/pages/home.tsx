import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { Moon, Sun, Send, MessageSquare } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";
import { ResponseCard } from "@/components/ResponseCard";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AIModel, ModelResponse, ComparisonResult } from "@/types/ai-models";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [prompt, setPrompt] = useState("Explain the concept of recursion in programming with a simple example.");
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "openai-gpt-5",
    "anthropic-claude-sonnet-4", 
    "gemini-2.5-pro",
    "deepseek-reasoner"
  ]);
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({});
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

  // Compare models mutation
  const compareModelsMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelIds: string[] }) => {
      const response = await apiRequest('POST', '/api/compare', data);
      return response.json() as Promise<ComparisonResult>;
    },
    onSuccess: (data) => {
      setResponses(data.responses);
      toast({
        title: "Comparison Complete",
        description: `Received responses from ${Object.keys(data.responses).length} models`,
      });
    },
    onError: (error) => {
      toast({
        title: "Comparison Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one model",
        variant: "destructive",
      });
      return;
    }

    // Initialize loading states
    const loadingResponses: Record<string, ModelResponse> = {};
    selectedModels.forEach(modelId => {
      loadingResponses[modelId] = {
        content: '',
        status: 'loading',
        responseTime: 0,
      };
    });
    setResponses(loadingResponses);

    // Start comparison
    compareModelsMutation.mutate({
      prompt: prompt.trim(),
      modelIds: selectedModels,
    });
  };

  const retryModel = (modelId: string) => {
    // Update single model to loading state
    setResponses(prev => ({
      ...prev,
      [modelId]: {
        content: '',
        status: 'loading',
        responseTime: 0,
      }
    }));

    // Retry the single model
    compareModelsMutation.mutate({
      prompt: prompt.trim(),
      modelIds: [modelId],
    });
  };

  const selectedModelData = models.filter(model => selectedModels.includes(model.id));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
        {/* Sidebar */}
        <Sidebar className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
          <SidebarHeader className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Comparison</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="flex-1 p-6 overflow-y-auto">
            {modelsLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              <ModelSelector
                models={models}
                selectedModels={selectedModels}
                onSelectionChange={setSelectedModels}
              />
            )}
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Model Comparison</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedModels.length} models selected
                </p>
              </div>
            </div>
          </header>

          {/* Prompt Input */}
          <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
            <div className="max-w-4xl">
              <Label htmlFor="prompt" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                Enter your prompt
              </Label>
              <div className="relative">
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                  placeholder="Ask a question or provide a prompt to compare across selected AI models..."
                />
                <div className="absolute bottom-3 right-3">
                  <span className="text-xs text-gray-400">{prompt.length}</span>
                  <span className="text-xs text-gray-400">/4000</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stream"
                      checked={streamResponses}
                      onCheckedChange={(checked) => setStreamResponses(checked === true)}
                    />
                    <Label htmlFor="stream" className="text-sm text-gray-600 dark:text-gray-400">
                      Stream responses
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timing"
                      checked={showTiming}
                      onCheckedChange={(checked) => setShowTiming(checked === true)}
                    />
                    <Label htmlFor="timing" className="text-sm text-gray-600 dark:text-gray-400">
                      Show timing
                    </Label>
                  </div>
                </div>
                
                <Button
                  onClick={handleSubmit}
                  disabled={compareModelsMutation.isPending || !prompt.trim() || selectedModels.length === 0}
                  className="bg-brand-500 hover:bg-brand-600 focus:ring-brand-500"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Compare Responses
                </Button>
              </div>
            </div>
          </div>

          {/* Response Grid */}
          <div className="flex-1 p-6 overflow-auto">
            {selectedModelData.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Models Selected</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select some models from the sidebar to start comparing AI responses.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
        </main>
      </div>
    </SidebarProvider>
  );
}
