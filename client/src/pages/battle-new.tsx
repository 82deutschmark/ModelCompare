/**
 * Battle Mode Component - Meeting-Style AI Model Debate Interface
 * 
 * This component provides a meeting-room style interface for AI model debates
 * featuring:
 * - Collapsible setup panel with customizable challenger prompts
 * - 6-seat table layout with 2 occupied by selected models
 * - Real-time conversation display with reasoning logs
 * - Meeting app-style UI with visual indicators for active speakers
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Sword, MessageSquare, Play, ArrowRight, Brain, 
  Settings, ChevronDown, ChevronUp, Loader2 
} from "lucide-react";
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
}

interface SpeakerSlot {
  id: string;
  modelId?: string;
  modelName?: string;
  isActive: boolean;
  currentContent?: string;
  reasoning?: string;
}

export default function BattleNew() {
  const { toast } = useToast();

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
  const [messages, setMessages] = useState<BattleMessage[]>([]);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [showSetup, setShowSetup] = useState(true);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  // Fetch available models
  const { data: models = [] } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Create speaker slots for meeting-style layout
  const createSpeakerSlots = (): SpeakerSlot[] => {
    const slots: SpeakerSlot[] = [];
    const model1 = models.find(m => m.id === model1Id);
    const model2 = models.find(m => m.id === model2Id);
    
    // First two slots are occupied by selected models
    if (model1) {
      const latestMessage = [...messages].reverse().find(m => m.modelId === model1Id);
      slots.push({
        id: 'slot1',
        modelId: model1Id,
        modelName: model1.name,
        isActive: activeSpeakers.includes(model1Id),
        currentContent: latestMessage?.content,
        reasoning: latestMessage?.reasoning
      });
    } else {
      slots.push({ id: 'slot1', isActive: false });
    }
    
    if (model2) {
      const latestMessage = [...messages].reverse().find(m => m.modelId === model2Id);
      slots.push({
        id: 'slot2',
        modelId: model2Id,
        modelName: model2.name,
        isActive: activeSpeakers.includes(model2Id),
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

  // Start battle mutation
  const startBattleMutation = useMutation({
    mutationFn: async (data: { prompt: string; model1Id: string; model2Id: string; challengerPrompt?: string }) => {
      const response = await apiRequest('POST', '/api/battle/start', data);
      return response.json() as Promise<{ model1Response: ModelResponse; model2Response: ModelResponse }>;
    },
    onSuccess: (data) => {
      const model1 = models.find(m => m.id === model1Id);
      const model2 = models.find(m => m.id === model2Id);
      
      setActiveSpeakers([]);
      setMessages([
        {
          modelId: model1Id,
          modelName: model1?.name || "Model 1",
          content: data.model1Response.content,
          timestamp: Date.now(),
          round: 1,
          responseTime: data.model1Response.responseTime,
          reasoning: data.model1Response.reasoning,
        },
        {
          modelId: model2Id,
          modelName: model2?.name || "Model 2", 
          content: data.model2Response.content,
          timestamp: Date.now() + 1,
          round: 1,
          responseTime: data.model2Response.responseTime,
          reasoning: data.model2Response.reasoning,
        }
      ]);
      setCurrentRound(1);
      
      toast({
        title: "Battle Started!",
        description: "Models have provided their initial responses",
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
      const nextRound = currentRound + 1;
      
      setMessages(prev => [...prev, {
        modelId: data.modelId,
        modelName: model?.name || "Model",
        content: data.response.content,
        timestamp: Date.now(),
        round: Math.ceil(nextRound / 2),
        responseTime: data.response.responseTime,
        reasoning: data.response.reasoning,
      }]);
      setCurrentRound(nextRound);
      setActiveSpeakers([]);

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

  const handleStartBattle = () => {
    if (!model1Id || !model2Id) {
      toast({
        title: "Select Both Models",
        description: "Please select two different models for the battle.",
        variant: "destructive",
      });
      return;
    }

    if (model1Id === model2Id) {
      toast({
        title: "Different Models Required",
        description: "Please select two different models for the battle.",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Enter Prompt",
        description: "Please enter a prompt to start the battle.",
        variant: "destructive",
      });
      return;
    }

    setActiveSpeakers([model1Id, model2Id]);
    setShowSetup(false);

    startBattleMutation.mutate({
      prompt: prompt,
      model1Id: model1Id,
      model2Id: model2Id,
      challengerPrompt: challengerPrompt,
    });
  };

  const handleEnterConversationMode = () => {
    setIsConversationMode(true);
    toast({
      title: "Conversation Mode Active",
      description: "Models will now debate for 10 rounds. Click continue to advance the conversation.",
    });
  };

  const handleContinueConversation = () => {
    if (currentRound >= 10) return;
    
    const nextModelId = currentRound % 2 === 0 ? model2Id : model1Id;
    setActiveSpeakers([nextModelId]);
    
    continueBattleMutation.mutate({
      battleHistory: messages,
      nextModelId,
    });
  };

  const handleResetBattle = () => {
    setModel1Id("");
    setModel2Id("");
    setPrompt(`• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`);
    setMessages([]);
    setCurrentRound(0);
    setIsConversationMode(false);
    setActiveSpeakers([]);
    setShowSetup(true);
  };

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Collapsible Setup Panel */}
        {showSetup && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Battle Setup</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSetup(false)}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Model 1</label>
                      <Select value={model1Id} onValueChange={setModel1Id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select first model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Model 2</label>
                      <Select value={model2Id} onValueChange={setModel2Id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select second model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      onClick={handleStartBattle}
                      disabled={startBattleMutation.isPending || !model1Id || !model2Id}
                      className="w-full"
                    >
                      {startBattleMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting Battle...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Battle
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Prompt</label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        placeholder="Enter debate topic..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Challenger Prompt</label>
                      <Textarea
                        value={challengerPrompt}
                        onChange={(e) => setChallengerPrompt(e.target.value)}
                        rows={2}
                        placeholder="Customize how Model 2 challenges Model 1..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Use {`{response}`} and {`{originalPrompt}`} as placeholders</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {!showSetup && messages.length === 0 && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSetup(true)}
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Show Setup
            </Button>
          </div>
        )}

        {/* Meeting-Style Table Layout */}
        <div className="meeting-layout">
          <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
            {createSpeakerSlots().map((slot) => (
              <div
                key={slot.id}
                className={`aspect-video rounded-lg border-2 transition-all duration-300 ${
                  slot.modelId 
                    ? slot.isActive 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="h-full flex flex-col">
                  {/* Model Name */}
                  <div className="p-3 border-b">
                    <h3 className={`font-medium text-center ${
                      slot.modelId ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                    }`}>
                      {slot.modelName || `Seat ${slot.id.slice(-1)}`}
                      {slot.isActive && (
                        <div className="flex items-center justify-center mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="ml-1 text-xs text-green-600">Speaking...</span>
                        </div>
                      )}
                    </h3>
                  </div>
                  
                  {/* Content Area */}
                  <div className="flex-1 p-3 overflow-hidden">
                    {slot.currentContent ? (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-6">
                          {slot.currentContent}
                        </div>
                        {slot.reasoning && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                            <strong>Reasoning:</strong> {slot.reasoning.slice(0, 100)}...
                          </div>
                        )}
                      </div>
                    ) : slot.modelId ? (
                      <div className="text-center text-gray-400 text-sm">
                        Waiting for response...
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-sm">
                        Available seat
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Battle Controls */}
          {messages.length > 0 && (
            <div className="mt-6 flex justify-center space-x-4">
              {!isConversationMode ? (
                <Button
                  onClick={handleEnterConversationMode}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Enter Conversation Mode
                </Button>
              ) : currentRound < 10 ? (
                <Button
                  onClick={handleContinueConversation}
                  disabled={continueBattleMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {continueBattleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Continuing...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Continue Debate (Round {Math.ceil((currentRound + 1) / 2)})
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">Battle Complete!</Badge>
                  <Button onClick={handleResetBattle} variant="outline">
                    Start New Battle
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Round Progress */}
          {isConversationMode && (
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Round {Math.ceil(currentRound / 2)} of 5 | {currentRound} of 10 messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}