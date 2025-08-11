/**
 * Battle Mode Page - AI Model Debate Interface
 * 
 * This page implements the "battle mode" feature where two AI models engage
 * in a structured debate. The workflow is:
 * 1. User provides initial prompt to Model 1
 * 2. Model 2 receives a system prompt to push back against Model 1's response
 * 3. User can enter "conversation mode" for 10 rounds of back-and-forth debate
 * 
 * The component manages the entire debate state, conversation history, and
 * provides controls for starting battles and entering conversation mode.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sword, MessageSquare, Play, ArrowRight, Users, Brain, Settings, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface BattleMessage {
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
    total: number;
  };
}

interface BattleState {
  model1Id: string;
  model2Id: string;
  initialPrompt: string;
  messages: BattleMessage[];
  currentRound: number;
  isConversationMode: boolean;
  isComplete: boolean;
}

interface SpeakerSlot {
  id: string;
  modelId?: string;
  modelName?: string;
  isActive: boolean;
  currentContent?: string;
  reasoning?: string;
}

export default function Battle() {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [battleState, setBattleState] = useState<BattleState>({
    model1Id: "",
    model2Id: "",
    initialPrompt: `• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`,
    messages: [],
    currentRound: 0,
    isConversationMode: false,
    isComplete: false,
  });
  
  const [challengerPrompt, setChallengerPrompt] = useState(`Your competitor told the user this: "{response}"

Push back on this information or advice. Explain why the user shouldn't trust the reply or should be wary. Be critical but constructive in your analysis.

Original user prompt was: "{originalPrompt}"`);
  
  const [showSetup, setShowSetup] = useState(true);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  // Fetch available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Start battle mutation
  const startBattleMutation = useMutation({
    mutationFn: async (data: { prompt: string; model1Id: string; model2Id: string; challengerPrompt?: string }) => {
      const response = await apiRequest('POST', '/api/battle/start', data);
      return response.json() as Promise<{ model1Response: ModelResponse; model2Response: ModelResponse }>;
    },
    onSuccess: (data) => {
      const model1 = models.find(m => m.id === battleState.model1Id);
      const model2 = models.find(m => m.id === battleState.model2Id);
      
      setBattleState(prev => ({
        ...prev,
        messages: [
          {
            modelId: battleState.model1Id,
            modelName: model1?.name || "Model 1",
            content: data.model1Response.content,
            timestamp: Date.now(),
            round: 1,
            reasoning: data.model1Response.reasoning,
            responseTime: data.model1Response.responseTime,
            tokenUsage: data.model1Response.tokenUsage,
            cost: data.model1Response.cost,
          },
          {
            modelId: battleState.model2Id,
            modelName: model2?.name || "Model 2", 
            content: data.model2Response.content,
            timestamp: Date.now() + 1,
            round: 1,
            reasoning: data.model2Response.reasoning,
            responseTime: data.model2Response.responseTime,
            tokenUsage: data.model2Response.tokenUsage,
            cost: data.model2Response.cost,
          }
        ],
        currentRound: 1,
      }));
      
      toast({
        title: "Battle Started!",
        description: "Both models have responded. Enter conversation mode to continue the debate.",
      });
    },
    onError: (error) => {
      toast({
        title: "Battle Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Continue conversation mutation
  const continueBattleMutation = useMutation({
    mutationFn: async (data: { battleHistory: BattleMessage[]; nextModelId: string }) => {
      const response = await apiRequest('POST', '/api/battle/continue', data);
      return response.json() as Promise<{ response: ModelResponse; modelId: string }>;
    },
    onSuccess: (data) => {
      const model = models.find(m => m.id === data.modelId);
      const nextRound = battleState.currentRound + 1;
      
      setBattleState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          modelId: data.modelId,
          modelName: model?.name || "Model",
          content: data.response.content,
          timestamp: Date.now(),
          round: Math.ceil(nextRound / 2),
          responseTime: data.response.responseTime,
          reasoning: data.response.reasoning,
        }],
        currentRound: nextRound,
        isComplete: nextRound >= 10,
      }));

      if (nextRound >= 10) {
        toast({
          title: "Battle Complete!",
          description: "The 10-round debate has concluded.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Battle Continuation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create speaker slots for meeting-style layout
  const createSpeakerSlots = (): SpeakerSlot[] => {
    const slots: SpeakerSlot[] = [];
    const model1 = models.find(m => m.id === battleState.model1Id);
    const model2 = models.find(m => m.id === battleState.model2Id);
    
    // First two slots are occupied by selected models
    if (model1) {
      const latestMessage = [...battleState.messages].reverse().find(m => m.modelId === battleState.model1Id);
      slots.push({
        id: 'slot1',
        modelId: battleState.model1Id,
        modelName: model1.name,
        isActive: activeSpeakers.includes(battleState.model1Id),
        currentContent: latestMessage?.content,
        reasoning: latestMessage?.reasoning
      });
    } else {
      slots.push({ id: 'slot1', isActive: false });
    }
    
    if (model2) {
      const latestMessage = [...battleState.messages].reverse().find(m => m.modelId === battleState.model2Id);
      slots.push({
        id: 'slot2',
        modelId: battleState.model2Id,
        modelName: model2.name,
        isActive: activeSpeakers.includes(battleState.model2Id),
        currentContent: latestMessage?.content,
        reasoning: latestMessage?.reasoning
      });
    } else {
      slots.push({ id: 'slot2', isActive: false });
    }
    
    // Four empty slots for future expansion
    for (let i = 3; i <= 6; i++) {
      slots.push({ id: `slot${i}`, isActive: false });
    }
    
    return slots;
  };

  const handleStartBattle = () => {
    if (!battleState.model1Id || !battleState.model2Id) {
      toast({
        title: "Select Both Models",
        description: "Please select two different models for the battle.",
        variant: "destructive",
      });
      return;
    }

    if (battleState.model1Id === battleState.model2Id) {
      toast({
        title: "Different Models Required",
        description: "Please select two different models for the battle.",
        variant: "destructive",
      });
      return;
    }

    if (!battleState.initialPrompt.trim()) {
      toast({
        title: "Enter Prompt",
        description: "Please enter a prompt to start the battle.",
        variant: "destructive",
      });
      return;
    }

    setActiveSpeakers([battleState.model1Id, battleState.model2Id]);
    setShowSetup(false);

    startBattleMutation.mutate({
      prompt: battleState.initialPrompt,
      model1Id: battleState.model1Id,
      model2Id: battleState.model2Id,
      challengerPrompt: challengerPrompt,
    });
  };

  const handleEnterConversationMode = () => {
    setBattleState(prev => ({ ...prev, isConversationMode: true }));
    toast({
      title: "Conversation Mode Active",
      description: "Models will now debate for 10 rounds. Click continue to advance the conversation.",
    });
  };

  const handleContinueConversation = () => {
    if (battleState.isComplete) return;
    
    const nextModelId = battleState.currentRound % 2 === 0 ? battleState.model2Id : battleState.model1Id;
    
    continueBattleMutation.mutate({
      battleHistory: battleState.messages,
      nextModelId,
    });
  };

  const handleResetBattle = () => {
    setBattleState({
      model1Id: "",
      model2Id: "",
      initialPrompt: `• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`,
      messages: [],
      currentRound: 0,
      isConversationMode: false,
      isComplete: false,
    });
    setActiveSpeakers([]);
    setShowSetup(true);
  };

  const selectedModel1 = models.find(m => m.id === battleState.model1Id);
  const selectedModel2 = models.find(m => m.id === battleState.model2Id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Sword className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Model Battle Mode</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>Compare Mode</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Battle Setup Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Battle Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Model 1 (Initial Response)
                    </label>
                    <Select value={battleState.model1Id} onValueChange={(value) => 
                      setBattleState(prev => ({ ...prev, model1Id: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select first model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Model 2 (Challenger)
                    </label>
                    <Select value={battleState.model2Id} onValueChange={(value) => 
                      setBattleState(prev => ({ ...prev, model2Id: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select second model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Initial Prompt
                  </label>
                  <Textarea
                    value={battleState.initialPrompt}
                    onChange={(e) => setBattleState(prev => ({ ...prev, initialPrompt: e.target.value }))}
                    rows={3}
                    placeholder="Enter the topic for debate..."
                  />
                </div>

                <div className="space-y-3">
                  {battleState.messages.length === 0 ? (
                    <Button
                      onClick={handleStartBattle}
                      disabled={startBattleMutation.isPending || !battleState.model1Id || !battleState.model2Id}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      {startBattleMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Starting Battle...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Battle
                        </>
                      )}
                    </Button>
                  ) : !battleState.isConversationMode ? (
                    <Button
                      onClick={handleEnterConversationMode}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Enter Conversation Mode
                    </Button>
                  ) : !battleState.isComplete ? (
                    <Button
                      onClick={handleContinueConversation}
                      disabled={continueBattleMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {continueBattleMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Continuing...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Continue Debate (Round {Math.ceil((battleState.currentRound + 1) / 2)})
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="text-center">
                      <Badge variant="secondary" className="mb-4">Battle Complete!</Badge>
                      <Button
                        onClick={handleResetBattle}
                        variant="outline"
                        className="w-full"
                      >
                        Start New Battle
                      </Button>
                    </div>
                  )}
                </div>

                {battleState.isConversationMode && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      Round {Math.ceil(battleState.currentRound / 2)} of 5
                      <br />
                      {battleState.currentRound} of 10 messages
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Battle Conversation */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Battle Conversation</span>
                  {selectedModel1 && selectedModel2 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Badge variant="outline">{selectedModel1.name}</Badge>
                      <span className="text-gray-400">vs</span>
                      <Badge variant="outline">{selectedModel2.name}</Badge>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {battleState.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Sword className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Battle in Progress</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Select two models and start a battle to see the debate unfold.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-96 overflow-y-auto">
                    {battleState.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.modelId === battleState.model1Id ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-3xl p-4 rounded-lg ${
                          message.modelId === battleState.model1Id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                            : 'bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={message.modelId === battleState.model1Id ? "default" : "destructive"}>
                              {message.modelName}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Round {message.round}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                            {message.content}
                          </div>
                          
                          {/* Token Usage and Cost Display */}
                          {(message.tokenUsage || message.cost) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                {message.tokenUsage && (
                                  <div>
                                    <span className="text-gray-500">Tokens:</span>
                                    <div className="font-mono">
                                      {message.tokenUsage.input}→{message.tokenUsage.output}
                                      {message.tokenUsage.reasoning && (
                                        <span className="text-amber-600">
                                          +{message.tokenUsage.reasoning} reasoning
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {message.cost && (
                                  <div>
                                    <span className="text-gray-500">Cost:</span>
                                    <div className="font-mono">
                                      ${message.cost.total.toFixed(6)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}