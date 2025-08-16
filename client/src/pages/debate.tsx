/**
 * Debate Mode - Structured, Robert's Rules AI Model Debate Interface
 *
 * This component provides a streamlined interface for setting up and running
 * structured, user-controlled debates between AI models following Robert's Rules.
 * Features include:
 * - Topic presets or custom topic with explicit Pro/Con roles
 * - Adversarial intensity control (respectful → combative)
 * - Manual step control with visual progress tracking
 * - Real-time cost calculation and reasoning log display
 * - Clean debate-focused UI distinct from Battle and Compare modes
 * - Modular prompt loading from docs/debate-prompts.md (no hardcoded topics/instructions)
 *
 * Author: Cascade
 * Date: August 16, 2025
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/ThemeProvider";
import { generateMarkdownExport, generateTextExport, downloadFile, generateSafeFilename, copyToClipboard, type ExportData } from '@/lib/exportUtils';
import type { AIModel, ModelResponse } from '@/types/ai-models';
import { parseDebatePromptsFromMarkdown, type DebateInstructions } from "@/lib/promptParser";
import { MessageCard, type MessageCardData } from "@/components/MessageCard";
import { AppNavigation } from "@/components/AppNavigation";
import { 
  ChevronLeft, ChevronUp, ChevronDown, Loader2, Play, Settings, Clock, DollarSign, Zap, AlertTriangle, Download, Copy,
  MessageSquare, Square, Brain, RotateCcw, Sword, Palette, Moon, Sun, Gavel, Users, Target
} from "lucide-react";

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

  // Debate instructions and topics loaded from docs/debate-prompts.md
  const [debateData, setDebateData] = useState<DebateInstructions | null>(null);
  const [debateLoading, setDebateLoading] = useState(true);
  const [debateError, setDebateError] = useState<string | null>(null);

  const adversarialLevels = [
    { id: 1, name: 'Respectful' },
    { id: 2, name: 'Assertive' },
    { id: 3, name: 'Aggressive' },
    { id: 4, name: 'Combative' }
  ];

  // State management
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [adversarialLevel, setAdversarialLevel] = useState(3);

  const [model1Id, setModel1Id] = useState('');
  const [model2Id, setModel2Id] = useState('');
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [showSystemPrompts, setShowSystemPrompts] = useState(false);

  // Load debate instructions/topics from docs
  useEffect(() => {
    const loadDebate = async () => {
      setDebateLoading(true);
      setDebateError(null);
      try {
        const data = await parseDebatePromptsFromMarkdown();
        if (!data) throw new Error('Failed to parse debate prompts');
        setDebateData(data);
        // Default to first topic if available
        if (data.topics.length > 0) {
          setSelectedTopic(data.topics[0].id);
        }
      } catch (e: any) {
        console.error(e);
        setDebateError(e.message || 'Failed to load debate prompts');
      } finally {
        setDebateLoading(false);
      }
    };
    loadDebate();
  }, []);

  // Generate Robert's Rules debate prompts using parsed templates
  const generateDebatePrompts = () => {
    const topicText = useCustomTopic
      ? customTopic
      : (debateData?.topics.find(t => t.id === selectedTopic)?.proposition || '');

    const base = (debateData?.baseTemplate || '')
      .replace('{TOPIC}', topicText)
      .replace('{INTENSITY}', String(adversarialLevel));

    const intensityText = debateData?.intensities?.[adversarialLevel] || '';

    const roleBlock = (role: 'AFFIRMATIVE' | 'NEGATIVE', position: 'FOR' | 'AGAINST') =>
      base
        .replace('{ROLE}', role)
        .replace('{POSITION}', position)
      + (intensityText ? `\n\n${intensityText}` : '');

    const rebuttalBase = (debateData?.templates.rebuttal || `You are continuing your formal debate role. Your opponent just argued: "{RESPONSE}"

Respond as the {ROLE} debater following Robert's Rules of Order:
1. Address your opponent's specific points
2. Refute their arguments with evidence and logic
3. Strengthen your own position
4. Use the adversarial intensity level: {INTENSITY}`)
      .replace('{INTENSITY}', String(adversarialLevel))
      + (intensityText ? `\n\n${intensityText}` : '');

    return {
      affirmativePrompt: roleBlock('AFFIRMATIVE', 'FOR'),
      negativePrompt: roleBlock('NEGATIVE', 'AGAINST'),
      rebuttalTemplate: rebuttalBase,
      topicText,
    } as const;
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
      const currentTopic = prompts.topicText;
      
      // Get the most recent opponent message
      const lastMessage = data.battleHistory[data.battleHistory.length - 1];
      
      const rebuttalPrompt = (prompts.rebuttalTemplate)
        .replace('{RESPONSE}', lastMessage.content)
        .replace('{ROLE}', role)
        .replace('{POSITION}', position)
        .replace('{ORIGINAL_PROMPT}', currentTopic)
        .replace('{TOPIC}', currentTopic);
      
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

  const formatCost = (cost: any) => {
    if (!cost || !cost.total) return 'N/A';
    return `$${cost.total.toFixed(4)}`;
  };

  // Convert DebateMessage to MessageCardData format
  const convertToMessageCardData = (message: DebateMessage): MessageCardData => {
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
      type: 'debate',
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

  const totalCost = messages.reduce((sum, msg) => sum + (msg.cost?.total || 0), 0);
  // Current prompts preview reflecting current selections
  const promptsPreview = debateData ? generateDebatePrompts() : null;

  // Export handlers
  const handleExportMarkdown = () => {
    if (messages.length === 0) return;

    const topicText = useCustomTopic 
      ? customTopic 
      : (debateData?.topics.find(t => t.id === selectedTopic)?.proposition || 'Custom Topic');

    const exportData: ExportData = {
      prompt: `Debate Topic: ${topicText}`,
      timestamp: new Date(),
      models: messages.map(msg => ({
        model: models.find(m => m.id === msg.modelId) as AIModel,
        response: {
          status: 'success' as const,
          content: msg.content,
          reasoning: msg.reasoning,
          responseTime: msg.responseTime,
          tokenUsage: msg.tokenUsage,
          cost: msg.cost,
        }
      })).filter(item => item.model)
    };

    const markdown = generateMarkdownExport(exportData);
    const filename = generateSafeFilename(`debate-${topicText}`, 'md');
    downloadFile(markdown, filename, 'text/markdown');
    
    toast({
      title: "Debate Exported",
      description: "Downloaded as markdown file",
    });
  };

  const handleCopyToClipboard = async () => {
    if (messages.length === 0) return;

    const topicText = useCustomTopic 
      ? customTopic 
      : (debateData?.topics.find(t => t.id === selectedTopic)?.proposition || 'Custom Topic');

    const exportData: ExportData = {
      prompt: `Debate Topic: ${topicText}`,
      timestamp: new Date(),
      models: messages.map(msg => ({
        model: models.find(m => m.id === msg.modelId) as AIModel,
        response: {
          status: 'success' as const,
          content: msg.content,
          reasoning: msg.reasoning,
          responseTime: msg.responseTime,
          tokenUsage: msg.tokenUsage,
          cost: msg.cost,
        }
      })).filter(item => item.model)
    };

    const markdown = generateMarkdownExport(exportData);
    const success = await copyToClipboard(markdown);
    
    if (success) {
      toast({
        title: "Copied to Clipboard",
        description: "Debate exported as markdown",
      });
    } else {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="AI Model Debate Mode" 
        subtitle="Structured, user-controlled debates (Robert's Rules)"
        icon={MessageSquare}
      />

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
                          {debateData?.topics.map((topic) => (
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
                        ? (customTopic || 'Enter custom topic above')
                        : (debateData?.topics.find(t => t.id === selectedTopic)?.proposition || 'Select a topic')}
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
                          <div className="text-xs text-gray-500 line-clamp-2">{debateData?.intensities?.[level.id] || ''}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      Higher intensity levels lead to more forceful rhetoric. Choose appropriately.
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={handleStartDebate}
                      disabled={startDebateMutation.isPending || !model1Id || !model2Id || debateLoading || !!debateError || (!useCustomTopic && !selectedTopic)}
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
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowSystemPrompts(!showSystemPrompts)}
                      className="w-full"
                    >
                      {showSystemPrompts ? 'Hide' : 'Show'} System Prompts
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Prompts Preview */}
        {showSystemPrompts && (model1Id || model2Id) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>System Prompts Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const prompts = generateDebatePrompts();
                  return (
                    <>
                      <div>
                        <h4 className="font-medium mb-2">Opening Statement (Model 1 - Affirmative):</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.affirmativePrompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Opening Statement (Model 2 - Negative):</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.negativePrompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Rebuttal Template:</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.rebuttalTemplate.replace('{RESPONSE}', '[Previous opponent message will appear here]')}
                        </pre>
                      </div>
                    </>
                  );
                })()}
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
                    onClick={handleExportMarkdown}
                    variant="outline"
                    size="sm"
                    disabled={messages.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    size="sm"
                    disabled={messages.length === 0}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  
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
              <div key={message.id} className={`${
                message.modelId === model1Id ? 'ml-0 mr-8' : 'ml-8 mr-0'
              }`}>
                {/* Debate side indicator */}
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    message.modelId === model1Id ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <Badge variant="outline" className="text-xs">
                    {message.modelId === model1Id ? 'Pro' : 'Con'} - Round {message.round}
                  </Badge>
                </div>
                
                <MessageCard 
                  message={convertToMessageCardData(message)}
                  variant="detailed"
                  showHeader={true}
                  showFooter={true}
                  className="shadow-sm"
                />
                
                {/* Continue Button - Only show on the last message */}
                {index === messages.length - 1 && currentRound > 0 && (
                  <div className="mt-4">
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
              </div>
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