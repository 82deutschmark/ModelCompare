/**
 * Creative Combat Page - Redesigned for Better UX
 * 
 * This page provides a clean, intuitive interface for AI Creative Combat mode.
 * Features a three-column layout:
 * - Left: Setup panel with category, prompt, and model management
 * - Center: Creative evolution display with latest work prominently featured
 * - Right: Model queue and progress tracking
 * 
 * The design focuses on the creative content and makes the collaborative
 * AI enhancement process clear and engaging.
 * 
 * Author: Cascade
 * Date: August 10, 2025
 */

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { MessageCard, type MessageCardData } from "@/components/MessageCard";
import { Link } from "wouter";
import { 
  Play, Plus, Loader2, Brain,
  Mic, Feather, Music, FileText, Code, BookOpen, 
  DollarSign, Clock, Zap, Timer, Users, Settings, Send,
  Sword, MessageSquare, Palette, Moon, Sun
} from "lucide-react";
import type { AIModel, ModelResponse } from "@/types/ai-models";

// Creative categories with icons
const categories = [
  { id: 'battle-rap', name: 'Battle Rap', icon: Mic },
  { id: 'poetry', name: 'Poetry', icon: Feather },
  { id: 'song-lyrics', name: 'Song Lyrics', icon: Music },
  { id: 'essay', name: 'Essay', icon: FileText },
  { id: 'code', name: 'Code', icon: Code },
  { id: 'story', name: 'Story', icon: BookOpen },
];

interface CreativeMessage {
  id: string;
  modelName: string;
  modelId: string;
  content: string;
  reasoning?: string;
  round: number;
  responseTime: number;
  cost?: { input: number; output: number };
  timestamp: Date;
}

export default function CreativeCombatNew() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State management
  const [selectedCategory, setSelectedCategory] = useState('battle-rap');
  const [prompt, setPrompt] = useState('Create an epic battle rap that showcases your lyrical prowess and AI capabilities. Go hard with clever wordplay, technical references, and devastating punchlines!');
  const [selectedModels, setSelectedModels] = useState(new Set<string>());
  const [messages, setMessages] = useState<CreativeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [models, setModels] = useState<AIModel[]>([]);

  // Load available models
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(setModels)
      .catch(console.error);
  }, []);

  // Update prompt when category changes
  useEffect(() => {
    const categoryPrompts: Record<string, string> = {
      'battle-rap': 'Create an epic battle rap that showcases your lyrical prowess and AI capabilities. Go hard with clever wordplay, technical references, and devastating punchlines!',
      'poetry': 'Write a hauntingly beautiful poem about the intersection of technology and human emotion, exploring themes of connection and isolation in the digital age.',
      'song-lyrics': 'Write compelling song lyrics that tell a story and connect emotionally with listeners. Include verses, chorus, and bridge.',
      'essay': 'Write a thought-provoking essay that explores a compelling topic with depth, insight, and engaging prose.',
      'code': 'Create an innovative coding solution that demonstrates creativity, elegance, and technical skill.',
      'story': 'Write a captivating short story that engages readers with memorable characters, plot, and vivid descriptions.'
    };
    setPrompt(categoryPrompts[selectedCategory] || '');
  }, [selectedCategory]);

  // Convert CreativeMessage to MessageCardData format
  const convertToMessageCardData = (message: CreativeMessage): MessageCardData => {
    return {
      id: message.id,
      modelName: message.modelName,
      modelId: message.modelId,
      content: message.content,
      reasoning: message.reasoning,
      responseTime: message.responseTime,
      round: message.round,
      timestamp: message.timestamp,
      type: 'creative',
      cost: message.cost ? {
        input: message.cost.input,
        output: message.cost.output,
        total: message.cost.input + message.cost.output
      } : undefined,
      modelConfig: {
        capabilities: {
          reasoning: !!message.reasoning,
          multimodal: false,
          functionCalling: false,
          streaming: false
        }
      }
    };
  };

  // Toggle model selection
  const toggleModel = (modelId: string) => {
    const newSelection = new Set(selectedModels);
    if (newSelection.has(modelId)) {
      newSelection.delete(modelId);
    } else {
      newSelection.add(modelId);
    }
    setSelectedModels(newSelection);
  };

  // Start creative session
  const startSession = async () => {
    if (selectedModels.size === 0) {
      toast({
        title: "No Models Selected",
        description: "Please select at least one model to start the session",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsSessionActive(true);
    setMessages([]);
    setCurrentRound(1);

    try {
      const response = await fetch('/api/creative-combat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          category: selectedCategory,
          modelIds: Array.from(selectedModels),
          currentRound: 1,
          previousContent: null
        }),
      });

      const data = await response.json();
      if (data.responses) {
        const newMessages: CreativeMessage[] = Object.entries(data.responses).map(([modelId, res]: [string, any]) => ({
          id: `${modelId}-${Date.now()}`,
          modelName: models.find(m => m.id === modelId)?.name || modelId,
          modelId,
          content: res.content,
          reasoning: res.reasoning,
          round: 1,
          responseTime: res.responseTime,
          cost: res.cost,
          timestamp: new Date(),
        }));
        setMessages(newMessages);
      }
    } catch (error) {
      toast({
        title: "Session Failed",
        description: "Failed to start creative session",
        variant: "destructive",
      });
      setIsSessionActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Continue session with next round
  const continueSession = async () => {
    if (messages.length === 0) return;

    setIsLoading(true);
    setCurrentRound(prev => prev + 1);

    try {
      const latestMessage = messages[messages.length - 1];
      const response = await fetch('/api/creative-combat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          category: selectedCategory,
          modelIds: Array.from(selectedModels),
          currentRound: currentRound + 1,
          previousContent: latestMessage.content
        }),
      });

      const data = await response.json();
      if (data.responses) {
        const newMessages: CreativeMessage[] = Object.entries(data.responses).map(([modelId, res]: [string, any]) => ({
          id: `${modelId}-${Date.now()}`,
          modelName: models.find(m => m.id === modelId)?.name || modelId,
          modelId,
          content: res.content,
          reasoning: res.reasoning,
          round: currentRound + 1,
          responseTime: res.responseTime,
          cost: res.cost,
          timestamp: new Date(),
        }));
        setMessages(prev => [...prev, ...newMessages]);
      }
    } catch (error) {
      toast({
        title: "Continue Failed",
        description: "Failed to continue creative session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get latest message
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // Format cost display
  const formatCost = (inputCost: number, outputCost: number) => {
    const total = inputCost + outputCost;
    return `$${total.toFixed(4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Palette className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Creative Combat</h1>
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

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Creative Combat
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI models building upon each other's creative work
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center">
                      <cat.icon className="w-4 h-4 mr-2" />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSessionActive ? (
              <Button onClick={startSession} disabled={isLoading || selectedModels.size === 0}>
                <Play className="w-4 h-4 mr-2" />
                Start Creative Session
              </Button>
            ) : (
              <Button onClick={continueSession} disabled={isLoading}>
                <Send className="w-4 h-4 mr-2" />
                Continue Evolution
              </Button>
            )}
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Setup */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Creative Prompt</label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your creative challenge..."
                    className="min-h-[100px] resize-y"
                  />
                </div>

                {/* Model Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Models</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedModels.has(model.id)
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                        }`}
                        onClick={() => toggleModel(model.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{model.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {model.provider}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Stats */}
                {isSessionActive && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span>Round:</span>
                      <Badge variant="outline">{currentRound}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span>Models:</span>
                      <Badge variant="outline">{selectedModels.size}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Creative Evolution */}
          <div className="lg:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Creative Evolution</span>
                  {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8" />
                    </div>
                    <p>Start a creative session to see AI models collaborate</p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[600px] overflow-y-auto">
                    {/* Latest Work - Featured */}
                    {latestMessage && (
                      <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <div className="p-3 border-b border-blue-200 dark:border-blue-700">
                          <Badge className="bg-blue-600">Latest Creation</Badge>
                        </div>
                        <div className="p-0">
                          <MessageCard 
                            message={convertToMessageCardData(latestMessage)}
                            variant="detailed"
                            showHeader={true}
                            showFooter={true}
                            className="border-0 shadow-none bg-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {/* Previous Versions */}
                    <div className="space-y-4">
                      {messages.slice(0, -1).reverse().map((message) => (
                        <MessageCard 
                          key={message.id}
                          message={convertToMessageCardData(message)}
                          variant="compact"
                          showHeader={true}
                          showFooter={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Model Queue */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Model Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedModels.size === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No models selected. Choose models from the setup panel.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Array.from(selectedModels).map((modelId, index) => {
                      const model = models.find(m => m.id === modelId);
                      if (!model) return null;
                      
                      return (
                        <div
                          key={modelId}
                          className="p-3 rounded border bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{model.name}</div>
                              <div className="text-xs text-gray-500">{model.provider}</div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Model Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Could open a model selection dialog or expand the setup panel
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
