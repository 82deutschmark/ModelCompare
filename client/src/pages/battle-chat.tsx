/**
 * Battle Mode Chat-Room Style Interface
 * 
 * This component provides a chat-room style interface for AI model debates
 * featuring:
 * - Main chat area with full scrollable conversation history
 * - Sidebar with model seats that can be clicked to add new models
 * - Options for new models to answer original prompt or rebut existing responses
 * - One model speaks at a time (no simultaneous responses)
 * - Proper reasoning logs display for supported models
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Sword, MessageSquare, Play, Brain, Settings, Plus, Users,
  ChevronDown, ChevronUp, Loader2, Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
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

  // State management
  const [prompt, setPrompt] = useState(`• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`);

  const [challengerPrompt, setChallengerPrompt] = useState(`Your competitor told the user this: "{response}"

Push back on this information or advice. Explain why the user shouldn't trust the reply or should be wary. Be critical but constructive in your analysis.

Original user prompt was: "{originalPrompt}"`);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [addModelDialog, setAddModelDialog] = useState<{ open: boolean; seatId: string }>({ open: false, seatId: '' });
  const [newModelAction, setNewModelAction] = useState<'original' | 'rebuttal'>('original');
  const [selectedMessage, setSelectedMessage] = useState<string>('');

  // Model seats (6 available seats)
  const [modelSeats, setModelSeats] = useState<ModelSeat[]>([
    { id: 'seat1', isActive: false, color: 'bg-blue-100 border-blue-500' },
    { id: 'seat2', isActive: false, color: 'bg-green-100 border-green-500' },
    { id: 'seat3', isActive: false, color: 'bg-purple-100 border-purple-500' },
    { id: 'seat4', isActive: false, color: 'bg-orange-100 border-orange-500' },
    { id: 'seat5', isActive: false, color: 'bg-pink-100 border-pink-500' },
    { id: 'seat6', isActive: false, color: 'bg-yellow-100 border-yellow-500' },
  ]);

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
      const result = await response.json() as ModelResponse;
      return { 
        content: result.content,
        responseTime: result.responseTime,
        reasoning: result.reasoning,
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
        type: data.action === 'original' ? 'prompt_response' : 'rebuttal'
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

  const handleAddModel = (seatId: string, modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    // Update seat with model info
    setModelSeats(prev => prev.map(seat => 
      seat.id === seatId 
        ? { ...seat, modelId, modelName: model.name, isActive: true }
        : seat
    ));

    // Make API call based on action
    addModelMutation.mutate({
      seatId,
      modelId,
      action: newModelAction,
      prompt: newModelAction === 'original' ? prompt : undefined,
      targetMessageId: newModelAction === 'rebuttal' ? selectedMessage : undefined
    });

    setAddModelDialog({ open: false, seatId: '' });
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
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Chat Battle</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          
          {/* Model Seats Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Model Seats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {modelSeats.map((seat) => (
                  <div
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
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
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Chat Conversation</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{messages.length} messages</Badge>
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
                <div className="px-6 pb-4 border-b">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Original Prompt</label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        placeholder="Enter the main topic..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Challenger Template</label>
                      <Textarea
                        value={challengerPrompt}
                        onChange={(e) => setChallengerPrompt(e.target.value)}
                        rows={3}
                        placeholder="Template for rebuttals..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="space-y-4 p-6">
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
                      return (
                        <div key={message.id} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={seat ? seat.color : 'bg-gray-100'}
                            >
                              {message.modelName}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Round {message.round} • {message.responseTime}ms
                            </span>
                            {message.type === 'rebuttal' && (
                              <Badge variant="secondary" className="text-xs">Rebuttal</Badge>
                            )}
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-gray-200 dark:border-gray-700">
                            <div className="text-gray-900 dark:text-white whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content}
                            </div>
                            {message.reasoning && (
                              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                                <strong className="text-yellow-800 dark:text-yellow-200">Reasoning:</strong>
                                <div className="mt-1 text-yellow-700 dark:text-yellow-300">
                                  {message.reasoning}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
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
                <label className="text-sm font-medium mb-2 block">Select Model</label>
                <Select onValueChange={(value) => {
                  if (value) handleAddModel(addModelDialog.seatId, value);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.filter(model => !modelSeats.some(seat => seat.modelId === model.id)).map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Action</label>
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
                  <label className="text-sm font-medium mb-2 block">Select Response to Rebut</label>
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
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}