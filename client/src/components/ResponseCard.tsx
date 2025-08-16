/**
 * Response Card Component - Individual AI Model Response Display
 * 
 * This component renders a single AI model's response in a card format with:
 * - Model name and provider information in the header
 * - Status indicators (loading, success, error) with appropriate styling
 * - Response timing information when available
 * - Loading skeleton animations during API calls
 * - Error states with retry functionality
 * - Response content with proper typography and formatting
 * - Copy-to-clipboard functionality for successful responses
 * 
 * The component handles all possible response states and provides a consistent
 * interface for displaying AI model outputs in the comparison grid.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Clock, AlertTriangle, CheckCircle, RotateCcw, Brain, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface ResponseCardProps {
  model: AIModel;
  response?: ModelResponse;
  onRetry?: () => void;
  showTiming?: boolean;
  systemPrompt?: string;
}

export function ResponseCard({ model, response, onRetry, showTiming, systemPrompt }: ResponseCardProps) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const copyToClipboard = async () => {
    if (!response?.content) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(response.content);
      toast({
        title: "Copied!",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const getStatusBadge = () => {
    if (!response) {
      return (
        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 px-1 py-0 text-xs">
          <Clock className="w-2 h-2 mr-1" />
          <span>Waiting</span>
        </Badge>
      );
    }

    switch (response.status) {
      case 'loading':
        return (
          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0 text-xs">
            <div className="w-2 h-2 mr-1 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Loading</span>
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0 text-xs">
            <CheckCircle className="w-2 h-2 mr-1" />
            <span>Complete</span>
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-1 py-0 text-xs">
            <AlertTriangle className="w-2 h-2 mr-1" />
            <span>Error</span>
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTime = (ms: number) => {
    return ms > 0 ? `${(ms / 1000).toFixed(1)}s` : '-';
  };

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-md ${response?.status === 'error' ? 'border-red-200 dark:border-red-800 shadow-red-100/50' : 'border-gray-200 dark:border-gray-700 shadow-sm'}`}>
      <CardHeader className={`pb-3 px-4 py-3 ${response?.status === 'error' ? 'bg-gradient-to-r from-red-50 to-red-50/80 dark:from-red-900/20 dark:to-red-900/10' : 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              model.provider === 'OpenAI' ? 'bg-green-500' :
              model.provider === 'Anthropic' ? 'bg-orange-500' :
              model.provider === 'Google' ? 'bg-blue-500' :
              model.provider === 'DeepSeek' ? 'bg-purple-500' :
              model.provider === 'xAI' ? 'bg-gray-500' : 'bg-gray-400'
            }`}>
              {model.provider.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{model.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{model.provider}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {response && showTiming && (
              <Badge variant="outline" className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(response.responseTime || 0)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-4 pb-4">
        {response?.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-4">
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : response?.status === 'error' ? (
          <div className="text-center py-4">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-red-600 dark:text-red-400 mb-3">
              {response.error || 'An error occurred while processing this request.'}
            </p>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20 px-2 py-1"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                <span className="text-xs">Retry</span>
              </Button>
            )}
          </div>
        ) : response?.status === 'success' ? (
          <div className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap text-sm p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-500">
                {response.content}
              </div>
            </div>

            {/* System Prompt (if available) */}
            {systemPrompt && (
              <Collapsible open={showSystemPrompt} onOpenChange={setShowSystemPrompt}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start px-1 py-1 h-6">
                    <FileText className="w-3 h-3 mr-1" />
                    <span className="text-xs">System Prompt</span>
                    {showSystemPrompt ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {systemPrompt}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Reasoning Logs (if available) */}
            {response.reasoning && (
              <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start px-1 py-1 h-6">
                    <Brain className="w-3 h-3 mr-1" />
                    <span className="text-xs">View Reasoning</span>
                    {showReasoning ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {response.reasoning}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Token Usage and Cost Information */}
            {(response.tokenUsage || response.cost) && (
              <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                  {response.tokenUsage && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">Tokens:</span>
                        <span className="font-mono text-xs">{response.tokenUsage.input}→{response.tokenUsage.output}</span>
                        {response.tokenUsage.reasoning && (
                          <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                            +{response.tokenUsage.reasoning} reasoning
                          </span>
                        )}
                      </div>
                      {response.cost && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">Cost:</span>
                          <span className="font-mono text-green-600 dark:text-green-400 text-xs">
                            ${response.cost.total.toFixed(4)}
                          </span>
                          {response.cost.reasoning && (
                            <span className="text-amber-600 dark:text-amber-400 text-xs">
                              (+${response.cost.reasoning.toFixed(4)} reasoning)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!response.tokenUsage && response.cost && (
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">Cost:</span>
                      <span className="font-mono text-green-600 dark:text-green-400 text-xs">
                        ${response.cost.total.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
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
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium">Waiting for response...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
