/**
 * Message Card Component - Unified Message Display Across All Modes
 * 
 * This component provides a standardized interface for displaying AI model messages
 * across all application modes (compare, creative-combat, battle-chat, debate).
 * It unifies the functionality from ResponseCard while being flexible enough
 * to handle the different message formats used in various modes.
 * 
 * Key Features:
 * - Consistent copy-to-clipboard functionality across all modes
 * - Support for reasoning logs display (collapsible)
 * - Token usage and cost information display
 * - Response timing and status indicators
 * - Flexible styling for different modes while maintaining consistency
 * - Support for round/turn indicators in debate/battle modes
 * - Model capability badges (reasoning, multimodal, etc.)
 * 
 * This component replaces the custom message displays in creative-combat,
 * battle-chat, and debate modes, ensuring feature parity across the app.
 * 
 * Author: Cascade Claude 4 Sonnet Thinking
 * Date: August 11, 2025
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Clock, Brain, ChevronDown, ChevronUp, DollarSign, Timer, Zap, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Unified message interface that works across all modes
interface MessageCardData {
  id: string;
  modelName: string;
  modelId: string;
  content: string;
  reasoning?: string;
  responseTime: number;
  round?: number;
  timestamp?: number | Date;
  type?: 'initial' | 'rebuttal' | 'prompt_response' | 'creative' | 'debate';
  systemPrompt?: string;
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
    provider?: string;
    capabilities?: {
      reasoning: boolean;
      multimodal: boolean;
      functionCalling: boolean;
      streaming: boolean;
    };
    pricing?: {
      inputPerMillion: number;
      outputPerMillion: number;
      reasoningPerMillion?: number;
    };
  };
}

interface MessageCardProps {
  message: MessageCardData;
  variant?: 'default' | 'compact' | 'detailed';
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  seatColor?: string; // For battle-chat mode seat colors
}

export function MessageCard({ 
  message, 
  variant = 'default',
  showHeader = true,
  showFooter = true,
  className = '',
  seatColor 
}: MessageCardProps) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const copyToClipboard = async () => {
    if (!message.content) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Copied!",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const formatTime = (ms: number) => {
    return ms > 0 ? `${(ms / 1000).toFixed(1)}s` : '-';
  };

  const getSpeedIcon = (responseTime: number) => {
    if (responseTime < 3000) return <Zap className="w-3 h-3 text-green-500" />;
    if (responseTime < 10000) return <Timer className="w-3 h-3 text-yellow-500" />;
    return <Clock className="w-3 h-3 text-gray-500" />;
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'OpenAI': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'Anthropic': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      'Google': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'xAI': 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
      'DeepSeek': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    };
    return colors[provider] || 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
  };

  // Variant-specific styling - optimized for better sizing
  const cardPadding = variant === 'compact' ? 'p-1' : 'p-2';
  const headerPadding = variant === 'compact' ? 'pb-1' : 'pb-1';

  return (
    <Card className={`${className} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200`}>
      {showHeader && (
        <CardHeader className={`${headerPadding} px-1 py-1 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {message.modelConfig?.provider && (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  message.modelConfig.provider === 'OpenAI' ? 'bg-green-500' :
                  message.modelConfig.provider === 'Anthropic' ? 'bg-orange-500' :
                  message.modelConfig.provider === 'Google' ? 'bg-blue-500' :
                  message.modelConfig.provider === 'DeepSeek' ? 'bg-purple-500' :
                  message.modelConfig.provider === 'xAI' ? 'bg-gray-500' : 'bg-gray-400'
                }`}>
                  {message.modelConfig.provider.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 font-semibold ${seatColor || 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                >
                  {message.modelName}
                </Badge>
                
                {message.modelConfig?.provider && (
                  <Badge
                    variant="secondary"
                    className={`text-xs px-1 py-0 ${getProviderColor(message.modelConfig.provider)}`}
                  >
                    {message.modelConfig.provider}
                  </Badge>
                )}
              
              {message.round && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  R{message.round}
                </Badge>
              )}
              
              {message.type === 'rebuttal' && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  Rebut
                </Badge>
              )}
              
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  {getSpeedIcon(message.responseTime)}
                  <span className="font-medium">{formatTime(message.responseTime)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5">
              {message.modelConfig?.capabilities?.reasoning && (
                <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1 py-0">
                  <Brain className="w-3 h-3" />
                </Badge>
              )}
              
              {message.cost && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  <DollarSign className="w-3 h-3" />
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={variant === 'compact' ? 'p-1' : 'p-2'}>
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <div className="text-gray-900 dark:text-gray-100 leading-snug whitespace-pre-wrap p-1 bg-gray-50/30 dark:bg-gray-800/30 rounded border-l-2 border-blue-500">
            {message.content}
          </div>
        </div>

        {/* System Prompt (if available) */}
        {message.systemPrompt && (
          <div className="mb-2">
            <Collapsible open={showSystemPrompt} onOpenChange={setShowSystemPrompt}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 px-1 py-1 h-6 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  {showSystemPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <FileText className="w-3 h-3" />
                  <span className="font-medium text-xs">System Prompt</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <div className="text-blue-900 dark:text-blue-100 text-xs whitespace-pre-wrap leading-relaxed">
                    {message.systemPrompt}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Reasoning Logs (if available) */}
        {message.reasoning && (
          <div className="mb-2">
            <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 px-1 py-1 h-6 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <Brain className="w-3 h-3" />
                  <span className="font-medium text-xs">Chain of Thought</span>
                  <Badge variant="outline" className="text-xs px-1 py-0 ml-1">
                    {message.reasoning.split('\n').length} steps
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                  <div className="text-amber-900 dark:text-amber-100 text-xs whitespace-pre-wrap leading-relaxed font-mono">
                    {message.reasoning}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {showFooter && (
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-1 mt-1 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              {message.tokenUsage && (
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  <span className="text-xs font-medium">Tokens:</span>
                  <span className="font-mono text-xs font-semibold">{message.tokenUsage.input}→{message.tokenUsage.output}</span>
                  {message.tokenUsage.reasoning && (
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-xs font-semibold">
                      +{message.tokenUsage.reasoning} reasoning
                    </span>
                  )}
                </div>
              )}
              
              {message.cost && (
                <div className="flex items-center space-x-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  <span className="text-xs font-medium">Cost:</span>
                  <span className="font-mono text-green-600 dark:text-green-400 text-xs font-semibold">
                    ${message.cost.total.toFixed(4)}
                  </span>
                  {message.cost.reasoning && (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                      (+${message.cost.reasoning.toFixed(4)} reasoning)
                    </span>
                  )}
                </div>
              )}

              {message.modelConfig?.capabilities && (
                <div className="flex items-center space-x-1">
                  {message.modelConfig.capabilities.multimodal && (
                    <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20" title="Can analyze images and visual content">
                      Vision
                    </Badge>
                  )}
                  {message.modelConfig.capabilities.functionCalling && (
                    <Badge variant="outline" className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900/20" title="Supports function calling">
                      Functions
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              disabled={isCopying}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 h-8 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <Copy className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">{isCopying ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { MessageCardData, MessageCardProps };
