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
  MessageSquare, Play, Square, Brain, DollarSign, Clock, ChevronDown, ChevronUp, Loader2, RotateCcw,
  Sword, Palette, Moon, Sun, Gavel, Users, Settings, Target
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
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
  const { theme, toggleTheme } = useTheme();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Debate topics - moved from docs/debate-prompts.md
  const debateTopics = [
    { id: 'death-penalty', title: 'Death Penalty', proposition: 'The death penalty should be abolished in all circumstances.' },
    { id: 'ai-regulation', title: 'AI Regulation', proposition: 'AI development should be heavily regulated by government agencies.' },
    { id: 'universal-basic-income', title: 'Universal Basic Income', proposition: 'Universal Basic Income should be implemented nationwide.' },
    { id: 'climate-change', title: 'Climate Policy', proposition: 'Immediate, drastic action on climate change is worth any economic cost.' },
    { id: 'social-media', title: 'Social Media Regulation', proposition: 'Social media platforms should be regulated like public utilities.' },
    { id: 'immigration', title: 'Immigration Policy', proposition: 'Open borders would benefit society more than harm it.' },
    { id: 'education', title: 'Education Policy', proposition: 'School choice and voucher systems improve education outcomes.' },
    { id: 'healthcare', title: 'Healthcare System', proposition: 'Single-payer healthcare is superior to market-based systems.' },
    { id: 'privacy', title: 'Privacy vs Security', proposition: 'Privacy rights should supersede national security concerns.' },
    { id: 'wealth-inequality', title: 'Economic Policy', proposition: 'Wealth inequality requires immediate government intervention.' },
    { id: 'drug-policy', title: 'Drug Policy', proposition: 'All recreational drugs should be legalized and regulated.' },
    { id: 'nuclear-energy', title: 'Nuclear Energy', proposition: 'Nuclear power is essential for clean energy transition.' }
  ];

  const adversarialLevels = [
    { id: 1, name: 'Respectful', description: 'Pleasant, academic exchange' },
    { id: 2, name: 'Assertive', description: 'Standard debate style' },
    { id: 3, name: 'Aggressive', description: 'Fiery, passionate debate' },
    { id: 4, name: 'Combative', description: 'Maximum adversarial intensity' }
  ];

  // State management
  const [selectedTopic, setSelectedTopic] = useState('death-penalty');
  const [customTopic, setCustomTopic] = useState('');
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [adversarialLevel, setAdversarialLevel] = useState(3);
  const [model1Id, setModel1Id] = useState('');
  const [model2Id, setModel2Id] = useState('');
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  // Generate Robert's Rules debate prompts
  const generateDebatePrompts = () => {
    const currentTopic = useCustomTopic ? customTopic : debateTopics.find(t => t.id === selectedTopic)?.proposition || '';
    
    const adversarialInstructions = {
      1: 'Maintain a respectful, academic tone. Acknowledge the validity of opposing viewpoints while presenting your case. Focus on facts and logical reasoning. Use phrases like "I respectfully disagree" and "While my opponent makes valid points..."',
      2: 'Be confident and assertive in your arguments. Challenge opposing points directly but professionally. Use strong language like "This argument fails because..." and "The evidence clearly shows..." while maintaining respect for your opponent.',
      3: 'Be forceful and passionate in your arguments. Challenge your opponent\'s logic vigorously. Use strong rhetoric like "This position is fundamentally flawed," "My opponent\'s argument crumbles under scrutiny," and "The facts devastate this position." Be intense but not personal.',
      4: 'Deploy maximum rhetorical force. Use sharp language, devastating critiques, and passionate advocacy. Challenge every weakness in your opponent\'s position. Use phrases like "This argument is utterly without merit," "My opponent\'s position is intellectually bankrupt," and "The evidence obliterates this claim." Be ruthless with ideas while remaining professional. Use a polemic style like Trotsky or Lenin.'
    };

    const baseInstructions = `You are participating in a formal debate following Robert's Rules of Order. You will be assigned either the AFFIRMATIVE (Pro) or NEGATIVE (Con) position on the debate topic.

DEBATE STRUCTURE RULES:
1. Present clear, evidence-based arguments
2. Address opponent's points directly in rebuttals
3. Use formal debate language and etiquette
4. Cite sources when possible (even if hypothetical)
5. Build logical chains of reasoning
6. Acknowledge strong opposing points while maintaining your position

Debate topic: ${currentTopic}
Adversarial intensity: Level ${adversarialLevel}

${adversarialInstructions[adversarialLevel as keyof typeof adversarialInstructions]}`;

    return {
      affirmativePrompt: `${baseInstructions}

Your debate role: AFFIRMATIVE (You are arguing FOR the proposition)
You must defend and support the proposition with compelling arguments, evidence, and reasoning.`,
      
      negativePrompt: `${baseInstructions}

Your debate role: NEGATIVE (You are arguing AGAINST the proposition)
You must oppose and refute the proposition with compelling counter-arguments, evidence, and reasoning.`,
      
      rebuttalPrompt: `You are continuing your formal debate role. Your opponent just argued: "{response}"

Respond as the {ROLE} debater following Robert's Rules of Order:
1. Address your opponent's specific points
2. Refute their arguments with evidence and logic
3. Strengthen your own position
4. Use the adversarial intensity level: ${adversarialLevel}

${adversarialInstructions[adversarialLevel as keyof typeof adversarialInstructions]}

Provide a strong rebuttal while advancing your {POSITION} position on: {originalPrompt}`
    };
  };

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

  // Start debate mutation - get the first model's (Affirmative) opening statement
  const startDebateMutation = useMutation({
    mutationFn: async (data: { model1Id: string; model2Id: string }) => {
      const prompts = generateDebatePrompts();
      const response = await apiRequest('POST', '/api/models/respond', {
        modelId: data.model1Id,
        prompt: prompts.affirmativePrompt
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

  // Continue debate mutation with structured rebuttals
  const continueDebateMutation = useMutation({
    mutationFn: async (data: { battleHistory: DebateMessage[]; nextModelId: string }) => {
      const prompts = generateDebatePrompts();
      const isNegativeDebater = data.nextModelId === model2Id;
      const role = isNegativeDebater ? 'NEGATIVE' : 'AFFIRMATIVE';
      const position = isNegativeDebater ? 'AGAINST' : 'FOR';
      const currentTopic = useCustomTopic ? customTopic : debateTopics.find(t => t.id === selectedTopic)?.proposition || '';
      
      // Get the most recent opponent message
      const lastMessage = data.battleHistory[data.battleHistory.length - 1];
      
      const rebuttalPrompt = prompts.rebuttalPrompt
        .replace('{response}', lastMessage.content)
        .replace('{ROLE}', role)
        .replace('{POSITION}', position)
        .replace('{originalPrompt}', currentTopic);
      
      const response = await apiRequest('POST', '/api/models/respond', {
        modelId: data.nextModelId,
        prompt: rebuttalPrompt
      });
      
      return { response: await response.json() as ModelResponse, modelId: data.nextModelId };
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

      const nextModel = models.find(m => m.id === (nextRound % 2 === 1 ? model2Id : model1Id));
      toast({
        title: "Response Added!",
        description: `${model?.name} has responded. Click Continue for ${nextModel?.name}'s turn.`,
      });
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
    if (!model1Id || !model2Id) {
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
      model1Id: model1Id,
      model2Id: model2Id,
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Debate Topic Selection */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gavel className="w-4 h-4" />
                    <label className="text-sm font-medium">Debate Topic</label>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="preset-topic"
                        checked={!useCustomTopic}
                        onChange={() => setUseCustomTopic(false)}
                      />
                      <label htmlFor="preset-topic" className="text-sm">Select from presets</label>
                    </div>
                    
                    {!useCustomTopic && (
                      <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose debate topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {debateTopics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{topic.title}</span>
                                <span className="text-xs text-gray-500 truncate max-w-48">
                                  {topic.proposition}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="custom-topic"
                        checked={useCustomTopic}
                        onChange={() => setUseCustomTopic(true)}
                      />
                      <label htmlFor="custom-topic" className="text-sm">Custom topic</label>
                    </div>
                    
                    {useCustomTopic && (
                      <Textarea
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="Enter your debate proposition..."
                        className="min-h-[80px]"
                      />
                    )}
                  </div>
                  
                  {/* Current Topic Display */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Current Topic:</div>
                    <div className="text-sm font-medium">
                      {useCustomTopic 
                        ? (customTopic || "Enter custom topic above") 
                        : debateTopics.find(t => t.id === selectedTopic)?.proposition
                      }
                    </div>
                  </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4" />
                    <label className="text-sm font-medium">Debaters</label>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Affirmative (Pro) - {models.find(m => m.id === model1Id)?.name || 'Select Model'}
                    </label>
                    <Select value={model1Id} onValueChange={setModel1Id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Pro debater" />
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
                    <label className="text-sm font-medium mb-2 block">
                      Negative (Con) - {models.find(m => m.id === model2Id)?.name || 'Select Model'}
                    </label>
                    <Select value={model2Id} onValueChange={setModel2Id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Con debater" />
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
                </div>

                {/* Adversarial Intensity */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-4 h-4" />
                    <label className="text-sm font-medium">Debate Intensity</label>
                  </div>
                  
                  <div className="space-y-3">
                    {adversarialLevels.map((level) => (
                      <div key={level.id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`level-${level.id}`}
                          checked={adversarialLevel === level.id}
                          onChange={() => setAdversarialLevel(level.id)}
                        />
                        <label htmlFor={`level-${level.id}`} className="flex-1">
                          <div className="text-sm font-medium">{level.name}</div>
                          <div className="text-xs text-gray-500">{level.description}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Level {adversarialLevel}:</strong> {adversarialLevels.find(l => l.id === adversarialLevel)?.description}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Ready to start formal Robert's Rules debate
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
                    {currentRound} exchanges • Manual control
                  </div>
                  {totalCost > 0 && (
                    <div className="text-sm font-medium text-green-600">
                      Total Cost: ${totalCost.toFixed(4)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  
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
                  
                  {/* Continue Button - Only show on the last message */}
                  {index === messages.length - 1 && currentRound > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={continueDebate}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 w-full"
                        disabled={continueDebateMutation.isPending}
                      >
                        {continueDebateMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Getting {models.find(m => m.id === (currentRound % 2 === 1 ? model2Id : model1Id))?.name}'s response...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Continue - {models.find(m => m.id === (currentRound % 2 === 1 ? model2Id : model1Id))?.name}'s turn
                          </>
                        )}
                      </Button>
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