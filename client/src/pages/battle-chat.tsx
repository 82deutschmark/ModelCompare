/**
 * Battle Mode Chat-Room Style Interface - Active Component for /battle Route
 * 
 * This component provides a chat-room style interface for AI model debates
 * featuring:
 * - Main chat area with full scrollable conversation history
 * - Dynamic sidebar with unlimited model seats that can be added on demand
 * - User-friendly dialog for adding models with action selection first
 * - Options for new models to answer original prompt or rebut existing responses
 * - One model speaks at a time (no simultaneous responses)
 * - Proper reasoning logs display for supported models
 * - Enhanced UX with confirmation before sending requests
 * - Cost tracking and response timing for each model interaction
 * 
 * Key Features:
 * - No limit on number of participating models (removes 6-model constraint)
 * - Improved add-model workflow: select action → select model → confirm
 * - Collapsible reasoning sections for models that support it
 * - Real-time cost calculation and performance metrics
 * - Full conversation history with proper threading
 * 
 * Author: Cascade AI Assistant with Claude 4 Sonnet Thinking
 * Date: August 10, 2025
 * Updated: Improved UX parity with other modes, unlimited models, better dialog flow
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sword, MessageSquare, Play, Brain, Settings, Plus, Users,
  Loader2, Send, DollarSign, Timer, Zap, Clock, Palette, Eye, BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MessageCard, type MessageCardData } from "@/components/MessageCard";
import { AppNavigation } from "@/components/AppNavigation";
import { ExportButton } from "@/components/ExportButton";
import { apiRequest } from "@/lib/queryClient";
import { parseBattlePromptsFromMarkdown, findBattlePromptPair, type BattlePromptCategory, type BattlePromptPair } from "@/lib/promptParser";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface ChatMessage {
  id: string;
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
  round: number;
  reasoning?: string;
  responseTime: number;
  type: 'initial' | 'rebuttal' | 'prompt_response';
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

interface ModelSeat {
  id: string;
  modelId?: string;
  modelName?: string;
  isActive: boolean;
  color: string;
}

export default function BattleChat() {
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State management - prompts loaded from markdown templates
  const [prompt, setPrompt] = useState('');
  const [challengerPrompt, setChallengerPrompt] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [addModelDialog, setAddModelDialog] = useState<{ open: boolean; seatId: string }>({ open: false, seatId: '' });
  const [newModelAction, setNewModelAction] = useState<'original' | 'rebuttal'>('original');
  const [selectedMessage, setSelectedMessage] = useState<string>('');

  // Battle prompt template state
  const [battlePromptCategories, setBattlePromptCategories] = useState<BattlePromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [currentBattlePrompt, setCurrentBattlePrompt] = useState<BattlePromptPair | null>(null);

  // Dynamic model seats (unlimited) - starts with one empty seat
  const [modelSeats, setModelSeats] = useState<ModelSeat[]>([
    { id: 'seat1', isActive: false, color: 'bg-blue-100 border-blue-500' },
  ]);

  // Available colors for new seats
  const seatColors = [
    'bg-blue-100 border-blue-500',
    'bg-green-100 border-green-500', 
    'bg-purple-100 border-purple-500',
    'bg-orange-100 border-orange-500',
    'bg-pink-100 border-pink-500',
    'bg-yellow-100 border-yellow-500',
    'bg-indigo-100 border-indigo-500',
    'bg-red-100 border-red-500',
    'bg-teal-100 border-teal-500',
    'bg-cyan-100 border-cyan-500',
    'bg-lime-100 border-lime-500',
    'bg-emerald-100 border-emerald-500'
  ];

  // Dialog state for better UX flow
  const [selectedModelForDialog, setSelectedModelForDialog] = useState<string>('');

  // Cost estimation helper
  const estimatePromptCost = (prompt: string, models: AIModel[]) => {
    if (!prompt.trim() || models.length === 0) return 0;
    
    // Rough token estimation: ~4 characters per token
    const estimatedTokens = Math.ceil(prompt.length / 4);
    let totalCost = 0;
    
    const activeModels = modelSeats.filter(seat => seat.isActive && seat.modelId);
    
    activeModels.forEach(seat => {
      const model = models.find(m => m.id === seat.modelId);
      if (model && (model as any).pricing) {
        const inputCost = (estimatedTokens / 1000000) * ((model as any).pricing.inputPerMillion || 0);
        // Estimate output tokens as 25% of input for rough calculation
        const outputCost = ((estimatedTokens * 0.25) / 1000000) * ((model as any).pricing.outputPerMillion || 0);
        totalCost += inputCost + outputCost;
      }
    });
    
    return totalCost;
  };

  // Load battle prompt templates on component mount
  useEffect(() => {
    const loadBattlePrompts = async () => {
      console.log('🔥 Starting to load battle prompts...');
      setPromptsLoading(true);
      try {
        const categories = await parseBattlePromptsFromMarkdown();
        console.log('🔥 Loaded battle categories:', categories);
        setBattlePromptCategories(categories);
        console.log('🔥 Categories set in state, length:', categories.length);
      } catch (error) {
        console.error('Failed to load battle prompt templates:', error);
        toast({
          title: 'Failed to load prompt templates',
          description: 'Using default prompt input only.',
          variant: 'destructive'
        });
      } finally {
        setPromptsLoading(false);
      }
    };
    
    loadBattlePrompts();
  }, [toast]);

  // Update prompts when template selection changes
  useEffect(() => {
    if (selectedPromptCategory && selectedPromptId && battlePromptCategories.length > 0) {
      const promptPair = findBattlePromptPair(
        battlePromptCategories, 
        selectedPromptCategory, 
        selectedPromptId
      );
      if (promptPair) {
        setCurrentBattlePrompt(promptPair);
        setPrompt(promptPair.personX);
        setChallengerPrompt(promptPair.challenger);
      }
    }
  }, [selectedPromptCategory, selectedPromptId, battlePromptCategories]);

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

  // Add model to seat mutation
  const addModelMutation = useMutation({
    mutationFn: async (data: { 
      seatId: string; 
      modelId: string; 
      action: 'original' | 'rebuttal'; 
      prompt?: string;
      targetMessageId?: string;
    }) => {
      let finalPrompt = data.prompt || prompt;
      
      if (data.action === 'rebuttal' && data.targetMessageId) {
        const targetMessage = messages.find(m => m.id === data.targetMessageId);
        if (targetMessage) {
          finalPrompt = challengerPrompt
            .replace('{response}', targetMessage.content)
            .replace('{originalPrompt}', prompt);
        }
      }

      const response = await apiRequest('POST', '/api/models/respond', {
        modelId: data.modelId,
        prompt: finalPrompt
      });
      const result = await response.json() as any;
      return { 
        content: result.content,
        responseTime: result.responseTime,
        reasoning: result.reasoning,
        tokenUsage: result.tokenUsage,
        modelConfig: result.modelConfig,
        seatId: data.seatId,
        action: data.action
      };
    },
    onMutate: (data) => {
      setActiveSpeaker(data.seatId);
    },
    onSuccess: (data) => {
      const seatData = modelSeats.find(s => s.id === data.seatId);
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        modelId: data.seatId,
        modelName: seatData?.modelName || 'Unknown Model',
        content: data.content,
        timestamp: Date.now(),
        round: messages.length + 1,
        reasoning: data.reasoning,
        responseTime: data.responseTime,
        type: data.action === 'original' ? 'prompt_response' : 'rebuttal',
        tokenUsage: data.tokenUsage,
        modelConfig: data.modelConfig
      };
      
      setMessages(prev => [...prev, newMessage]);
      setActiveSpeaker(null);
      
      toast({
        title: "Response Added",
        description: `${seatData?.modelName} has joined the conversation`,
      });
    },
    onError: (error) => {
      setActiveSpeaker(null);
      toast({
        title: "Response Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add a new empty seat when needed
  const addNewSeat = () => {
    const nextSeatId = `seat${modelSeats.length + 1}`;
    const colorIndex = modelSeats.length % seatColors.length;
    const newSeat: ModelSeat = {
      id: nextSeatId,
      isActive: false,
      color: seatColors[colorIndex]
    };
    setModelSeats(prev => [...prev, newSeat]);
  };

  const handleConfirmAddModel = () => {
    if (!selectedModelForDialog) return;
    
    const model = models.find(m => m.id === selectedModelForDialog);
    if (!model) return;

    const { seatId } = addModelDialog;

    // Update seat with model info
    setModelSeats(prev => prev.map(seat => 
      seat.id === seatId 
        ? { ...seat, modelId: selectedModelForDialog, modelName: model.name, isActive: true }
        : seat
    ));

    // Add a new empty seat if this was the last available seat
    if (modelSeats.every(seat => seat.isActive || seat.id === seatId)) {
      addNewSeat();
    }

    // Make API call based on action
    addModelMutation.mutate({
      seatId,
      modelId: selectedModelForDialog,
      action: newModelAction,
      prompt: newModelAction === 'original' ? prompt : undefined,
      targetMessageId: newModelAction === 'rebuttal' ? selectedMessage : undefined
    });

    // Reset dialog state
    setAddModelDialog({ open: false, seatId: '' });
    setSelectedModelForDialog('');
    setNewModelAction('original');
    setSelectedMessage('');
  };

  const handleSeatClick = (seat: ModelSeat) => {
    if (seat.modelId) return; // Seat already occupied
    
    setAddModelDialog({ open: true, seatId: seat.id });
    setNewModelAction('original');
    setSelectedMessage('');
  };

  const handleResetChat = () => {
    setMessages([]);
    setModelSeats(prev => prev.map(seat => ({ 
      ...seat, 
      modelId: undefined, 
      modelName: undefined, 
      isActive: false 
    })));
    setActiveSpeaker(null);
    setShowSetup(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="AI Chat Battle" 
        subtitle="Chat-style model debates"
        icon={Sword}
      />

      <div className="max-w-7xl mx-auto px-1 py-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-1 h-[calc(100vh-80px)]">
          
          {/* Model Seats Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="p-2">
                <CardTitle className="flex items-center space-x-1 text-sm">
                  <Users className="w-4 h-4" />
                  <span>Model Seats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {modelSeats.map((seat) => (
                  <div
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    className={`p-1 rounded border cursor-pointer transition-all duration-200 ${
                      seat.modelId 
                        ? `${seat.color} opacity-100`
                        : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    } ${seat.isActive && activeSpeaker === seat.id ? 'ring-2 ring-green-400' : ''}`}
                  >
                    <div className="text-center">
                      {seat.modelId ? (
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {seat.modelName}
                          </div>
                          {activeSpeaker === seat.id && (
                            <div className="mt-1 flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                              <span className="text-xs text-green-600">Typing...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm flex items-center justify-center">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Model
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {messages.length > 0 && (
                  <Button
                    onClick={handleResetChat}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                  >
                    Reset Chat
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0 p-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-1 text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat Conversation</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{messages.length} messages</Badge>
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
                      chatMessages={messages}
                      variant="battle"
                      disabled={activeSpeaker !== null || messages.length === 0}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSetup(!showSetup)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Setup Panel */}
              {showSetup && (
                <>
                <Separator />
                <div className="px-2 pb-1">
                  {/* Template Selection */}
                  {!promptsLoading && battlePromptCategories.length > 0 && (
                    <Alert className="mb-1">
                      <AlertDescription>
                        <div className="flex items-center gap-1 mb-1">
                          <Settings className="w-4 h-4" />
                          <h3 className="text-sm font-medium">Battle Prompt Templates</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium mb-1 block text-gray-600 dark:text-gray-400">Category</label>
                            <Select value={selectedPromptCategory} onValueChange={setSelectedPromptCategory}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {battlePromptCategories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block text-gray-600 dark:text-gray-400">Template</label>
                            <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select template" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedPromptCategory &&
                                  battlePromptCategories
                                    .find(cat => cat.id === selectedPromptCategory)
                                    ?.prompts.map((promptPair) => (
                                      <SelectItem key={promptPair.id} value={promptPair.id}>
                                        {promptPair.name}
                                      </SelectItem>
                                    ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {currentBattlePrompt && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            Using template: <span className="font-medium">{currentBattlePrompt.name}</span>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Original Prompt</label>
                      <div className="relative">
                        <Textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          rows={4}
                          className="pr-20"
                          placeholder="Enter the main topic..."
                        />
                        <div className="absolute bottom-1 right-1 text-xs text-gray-400 flex items-center space-x-1">
                          {modelSeats.some(seat => seat.isActive) && (
                            <>
                              <DollarSign className="w-3 h-3" />
                              <span>~${estimatePromptCost(prompt, models).toFixed(4)}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{prompt.length}/32000</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Challenger Template</label>
                      <div className="relative">
                        <Textarea
                          value={challengerPrompt}
                          onChange={(e) => setChallengerPrompt(e.target.value)}
                          rows={4}
                          className="pr-20"
                          placeholder="Template for rebuttals..."
                        />
                        <div className="absolute bottom-1 right-1 text-xs text-gray-400 flex items-center space-x-1">
                          <span>{challengerPrompt.length}/32000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </>
              )}

              {/* Raw Prompt Preview */}
              {showPromptPreview && (
                <div className="px-6 pb-4 border-b">
                  <Card className="bg-gray-50 dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <BookOpen className="w-4 h-4" />
                        <span>Raw Prompt Preview</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="bg-white dark:bg-gray-900 rounded-md p-3 border">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                          {prompt || 'No prompt entered'}
                        </pre>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This is the exact prompt that will be sent to AI models in the chat.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Chat Messages */}
              <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="space-y-1 p-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Conversation Yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Click on empty seats to add models and start the debate.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const seat = modelSeats.find(s => s.modelId && s.modelId === message.modelId);
                      
                      // Convert ChatMessage to MessageCardData format
                      const convertToMessageCardData = (message: ChatMessage): MessageCardData => {
                        const model = models.find(m => m.id === message.modelId);
                        
                        return {
                          id: message.id,
                          modelName: message.modelName,
                          modelId: message.modelId,
                          content: message.content,
                          reasoning: message.reasoning,
                          responseTime: message.responseTime,
                          round: message.round,
                          timestamp: message.timestamp,
                          type: message.type,
                          tokenUsage: message.tokenUsage,
                          cost: message.cost,
                          modelConfig: {
                            provider: model?.provider,
                            capabilities: message.modelConfig?.capabilities || {
                              reasoning: !!message.reasoning,
                              multimodal: false,
                              functionCalling: false,
                              streaming: false
                            },
                            pricing: message.modelConfig?.pricing
                          }
                        };
                      };

                      return (
                        <MessageCard
                          key={message.id}
                          message={convertToMessageCardData(message)}
                          variant="compact"
                          showHeader={true}
                          showFooter={true}
                          seatColor={seat?.color}
                          className="mb-1"
                        />
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Model Dialog */}
        <Dialog open={addModelDialog.open} onOpenChange={(open) => setAddModelDialog({ open, seatId: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Model to Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">1. Choose Action</label>
                <Select value={newModelAction} onValueChange={(value: 'original' | 'rebuttal') => setNewModelAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Answer Original Prompt</SelectItem>
                    <SelectItem value="rebuttal">Rebut a Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newModelAction === 'rebuttal' && messages.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">2. Select Response to Rebut</label>
                  <Select value={selectedMessage} onValueChange={setSelectedMessage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a message to rebut" />
                    </SelectTrigger>
                    <SelectContent>
                      {messages.map((message) => (
                        <SelectItem key={message.id} value={message.id}>
                          {message.modelName}: {message.content.slice(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {newModelAction === 'rebuttal' ? '3. Select Model' : '2. Select Model'}
                </label>
                <Select value={selectedModelForDialog} onValueChange={setSelectedModelForDialog}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                              {(model as any).capabilities?.reasoning && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                                  <Brain className="w-3 h-3 mr-1" />
                                  Reasoning
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {(model as any).capabilities?.multimodal && 'Vision • '}
                              {(model as any).capabilities?.functionCalling && 'Functions • '}
                              Context: {(model as any).limits?.contextWindow?.toLocaleString() || 'N/A'}
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-xs text-gray-500">
                            <span>${((model as any).pricing?.inputPerMillion || 0).toFixed(2)}/${((model as any).pricing?.outputPerMillion || 0).toFixed(2)}</span>
                            <span>per 1M tokens</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAddModelDialog({ open: false, seatId: '' });
                    setSelectedModelForDialog('');
                    setNewModelAction('original');
                    setSelectedMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmAddModel}
                  disabled={!selectedModelForDialog || (newModelAction === 'rebuttal' && !selectedMessage)}
                >
                  Add Model & Send
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}