/**
 * Debate Mode - Dedicated 10-Round AI Model Debate Interface
 * 
 * This component provides a streamlined interface for setting up and running
 * automatic 10-round debates between AI models. Features include:
 * - Simple 2-model selection with customizable prompts
 * - Automatic conversation flow with visual progress tracking
 * - Real-time cost calculation and reasoning log display
 * - Clean debate-focused UI distinct from Battle and Compare modes
 * 
 * Author: Replit Agent
 * Date: August 10, 2025
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MessageSquare, Play, Square, Brain, DollarSign, Clock, ChevronDown, ChevronUp, Loader2, RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface DebateMessage {
  id: string;
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
  round: number;
  reasoning?: string;
  responseTime: number;
  tokenUsage?: {
    input: number;
    output: number;
    reasoning?: number;
  };
  cost?: {
    input: number;
    output: number;
    reasoning?: number;
    total: number;
  };
  modelConfig?: {
    capabilities: {
      reasoning: boolean;
      multimodal: boolean;
      functionCalling: boolean;
      streaming: boolean;
    };
    pricing: {
      inputPerMillion: number;
      outputPerMillion: number;
      reasoningPerMillion?: number;
    };
  };
}

export default function Debate() {
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State management
  const [prompt, setPrompt] = useState(`• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`);

  const [challengerPrompt, setChallengerPrompt] = useState(`Your competitor told the user this: "{response}"

Push back on this information or advice. Explain why the user shouldn't trust the reply or should be wary. Be critical but constructive in your analysis.

Original user prompt was: "{originalPrompt}"`);

  const [model1Id, setModel1Id] = useState('');
  const [model2Id, setModel2Id] = useState('');
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch available models
  const { data: models = [] } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Start debate mutation - just get the first model's response
  const startDebateMutation = useMutation({
    mutationFn: async (data: { prompt: string; model1Id: string; model2Id: string; challengerPrompt?: string }) => {
      // Only get the first model's response to the original prompt
      const response = await apiRequest('POST', '/api/models/respond', {
        modelId: data.model1Id,
        prompt: data.prompt
      });
      return response.json() as Promise<ModelResponse>;
    },
    onSuccess: (data) => {
      const model1 = models.find(m => m.id === model1Id);
      
      // Start with just Model 1's initial statement
      setMessages([
        {
          id: `msg-1`,
          modelId: model1Id,
          modelName: model1?.name || "Model 1",
          content: data.content,
          timestamp: Date.now(),
          round: 1,
          responseTime: data.responseTime,
          reasoning: data.reasoning,
          tokenUsage: data.tokenUsage,
          cost: data.cost,
          modelConfig: data.modelConfig,
        }
      ]);
      setCurrentRound(1);
      setShowSetup(false);
      
      toast({
        title: "Debate Started!",
        description: `${model1?.name} has made their opening statement. Click Continue to get ${models.find(m => m.id === model2Id)?.name}'s rebuttal.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Debate Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Continue debate mutation
  const continueDebateMutation = useMutation({
    mutationFn: async (data: { battleHistory: DebateMessage[]; nextModelId: string }) => {
      const response = await apiRequest('POST', '/api/battle/continue', {
        ...data,
        challengerPrompt: challengerPrompt,
        originalPrompt: prompt
      });
      return response.json() as Promise<{ response: ModelResponse; modelId: string }>;
    },
    onSuccess: (data) => {
      const model = models.find(m => m.id === data.modelId);
      const nextRound = currentRound + 1;
      
      setMessages(prev => [...prev, {
        id: `msg-${nextRound}`,
        modelId: data.modelId,
        modelName: model?.name || "Model",
        content: data.response.content,
        timestamp: Date.now(),
        round: Math.ceil(nextRound / 2),
        responseTime: data.response.responseTime,
        reasoning: data.response.reasoning,
        tokenUsage: data.response.tokenUsage,
        cost: data.response.cost,
        modelConfig: data.response.modelConfig,
      }]);
      
      setCurrentRound(nextRound);

      if (nextRound >= 10) {
        toast({
          title: "Debate Complete!",
          description: "The 10-round debate has concluded.",
        });
      } else {
        const nextModel = models.find(m => m.id === (nextRound % 2 === 1 ? model2Id : model1Id));
        toast({
          title: "Response Added!",
          description: `${model?.name} has responded. ${nextRound < 10 ? `Click Continue for ${nextModel?.name}'s turn.` : ''}`,
        });
      }
    },
    onError: (error) => {
      setIsRunning(false);
      toast({
        title: "Debate Continuation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to manually continue the debate
  const continueDebate = () => {
    if (currentRound >= 10 || !model1Id || !model2Id) {
      return;
    }

    // Determine which model should respond next (alternate between them)
    const nextModelId = currentRound % 2 === 1 ? model2Id : model1Id;

    continueDebateMutation.mutate({
      battleHistory: messages,
      nextModelId: nextModelId
    });
  };

  const handleStartDebate = () => {
    if (!model1Id || !model2Id) {
      toast({
        title: "Select Both Models",
        description: "Please select two models for the debate.",
        variant: "destructive",
      });
      return;
    }

    if (model1Id === model2Id) {
      toast({
        title: "Different Models Required",
        description: "Please select two different models for the debate.",
        variant: "destructive",
      });
      return;
    }

    startDebateMutation.mutate({
      prompt: prompt,
      model1Id: model1Id,
      model2Id: model2Id,
      challengerPrompt: challengerPrompt,
    });
  };

  const handleStopDebate = () => {
    setIsRunning(false);
    toast({
      title: "Debate Stopped",
      description: "Automatic debate has been halted.",
    });
  };

  const handleResetDebate = () => {
    setModel1Id("");
    setModel2Id("");
    setMessages([]);
    setCurrentRound(0);
    setIsRunning(false);
    setShowSetup(true);
  };

  const formatCost = (cost?: { total: number; reasoning?: number }) => {
    if (!cost) return 'N/A';
    return `$${cost.total.toFixed(4)}${cost.reasoning ? ` (+$${cost.reasoning.toFixed(4)} reasoning)` : ''}`;
  };

  const totalCost = messages.reduce((sum, msg) => sum + (msg.cost?.total || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Model Debate Mode</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Automatic 10-round debates</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>Compare Mode</span>
                </Button>
              </Link>
              <Link href="/battle">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Battle Mode</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Setup Panel */}
        {showSetup && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Debate Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Debater 1</label>
                    <Select value={model1Id} onValueChange={setModel1Id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select first model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center space-x-2">
                              <span>{model.name}</span>
                              <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Debater 2</label>
                    <Select value={model2Id} onValueChange={setModel2Id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select second model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center space-x-2">
                              <span>{model.name}</span>
                              <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={handleStartDebate}
                    disabled={startDebateMutation.isPending || !model1Id || !model2Id}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {startDebateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Getting Opening Statement...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Debate ({models.find(m => m.id === model1Id)?.name} goes first)
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Debate Topic</label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      placeholder="Enter debate topic..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Challenge Style</label>
                    <Textarea
                      value={challengerPrompt}
                      onChange={(e) => setChallengerPrompt(e.target.value)}
                      rows={2}
                      placeholder="How should models challenge each other..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {`{response}`} and {`{originalPrompt}`} as placeholders</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debate Progress and Controls */}
        {messages.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium">
                    Round {Math.ceil(currentRound / 2)} of 5
                  </div>
                  <Progress value={(currentRound / 10) * 100} className="w-40" />
                  <div className="text-sm text-gray-500">
                    {currentRound}/10 exchanges
                  </div>
                  {totalCost > 0 && (
                    <div className="text-sm font-medium text-green-600">
                      Total Cost: ${totalCost.toFixed(4)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {currentRound < 10 && currentRound > 0 ? (
                    <Button
                      onClick={continueDebate}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={continueDebateMutation.isPending}
                    >
                      {continueDebateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Getting Response...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Continue ({models.find(m => m.id === (currentRound % 2 === 1 ? model2Id : model1Id))?.name}'s turn)
                        </>
                      )}
                    </Button>
                  ) : null}
                  
                  <Button
                    onClick={handleResetDebate}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    New Debate
                  </Button>
                  
                  <Button
                    onClick={() => setShowSetup(!showSetup)}
                    variant="ghost"
                    size="sm"
                  >
                    {showSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              {continueDebateMutation.isPending && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>Waiting for {models.find(m => m.id === (currentRound % 2 === 1 ? model2Id : model1Id))?.name}'s response...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <Card key={message.id} className={`${
                message.modelId === model1Id ? 'ml-0 mr-8' : 'ml-8 mr-0'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        message.modelId === model1Id ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <h3 className="font-medium">{message.modelName}</h3>
                      <Badge variant="outline" className="text-xs">
                        Round {message.round}
                      </Badge>
                      {message.modelConfig?.capabilities.reasoning && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                          <Brain className="w-3 h-3 mr-1" />
                          Reasoning
                        </Badge>
                      )}
                      {message.cost && (
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ${message.cost.total.toFixed(4)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{(message.responseTime / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Reasoning Section */}
                  {message.reasoning && (
                    <div className="mt-4">
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center space-x-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300">
                          <Brain className="w-4 h-4" />
                          <span>Chain of Thought</span>
                          <ChevronDown className="w-4 h-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                              {message.reasoning}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                  
                  {/* Token Usage and Cost Information */}
                  {(message.tokenUsage || message.cost) && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        {message.tokenUsage && (
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <span>Tokens:</span>
                              <span className="font-mono">{message.tokenUsage.input}→{message.tokenUsage.output}</span>
                              {message.tokenUsage.reasoning && (
                                <span className="text-amber-600 dark:text-amber-400 font-mono">
                                  +{message.tokenUsage.reasoning} reasoning
                                </span>
                              )}
                            </div>
                            {message.cost && (
                              <div className="flex items-center space-x-1">
                                <span>Cost:</span>
                                <span className="font-mono text-green-600 dark:text-green-400">
                                  {formatCost(message.cost)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Empty State */}
        {messages.length === 0 && !showSetup && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready for Debate</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Configure your debate setup above and start a 10-round AI model debate.
              </p>
              <Button onClick={() => setShowSetup(true)} variant="outline">
                Show Setup Panel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}