/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-14
 * PURPOSE: Enhanced ResponseCard component using improved shadcn/ui patterns.
 * Better status badges, alerts for errors, proper skeleton states, and consistent typography.
 * Uses new centralized model configuration for provider colors and information.
 * SRP/DRY check: Pass - Single responsibility (response display), reuses shadcn/ui components
 * shadcn/ui: Pass - Uses Card, Badge, Alert, Skeleton, Collapsible, and other shadcn/ui components
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Copy,
  Clock,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Brain,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCost, formatTokens, formatResponseTime } from "@/lib/formatUtils";
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
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Waiting
        </Badge>
      );
    }

    switch (response.status) {
      case 'loading':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Generating
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      'OpenAI': 'OAI',
      'Anthropic': 'ANT',
      'Gemini': 'GEM',
      'DeepSeek': 'DS',
      'xAI': 'XAI',
    };
    return icons[provider] || provider.substring(0, 2).toUpperCase();
  };



  return (
    <Card className={cn(
      "h-full transition-all duration-200 hover:shadow-lg",
      response?.status === 'error' && "border-destructive/50"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Provider Avatar using model color */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn("text-xs font-bold text-white", model.color)}>
                {getProviderIcon(model.provider)}
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="font-semibold text-sm">{model.name}</h3>
              <p className="text-xs text-muted-foreground">{model.provider}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {response && showTiming && (                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatResponseTime(response.responseTime)}
                </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {response?.status === 'loading' ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ) : response?.status === 'error' ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <p className="mb-3">
                {response.error || 'An error occurred while processing this request.'}
              </p>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ) : response?.status === 'success' ? (
          <div className="space-y-4">
            {/* Response Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {response.content}
                </pre>
              </div>
            </div>

            {/* System Prompt */}
            {systemPrompt && (
              <Collapsible open={showSystemPrompt} onOpenChange={setShowSystemPrompt}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start h-8">
                    <FileText className="w-4 h-4 mr-2" />
                    System Prompt
                    {showSystemPrompt ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-3 bg-secondary/50 rounded-lg border">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {systemPrompt}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Reasoning */}
            {response.reasoning && (
              <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start h-8">
                    <Brain className="w-4 h-4 mr-2" />
                    Reasoning Process
                    {showReasoning ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {response.reasoning}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Metrics */}
            {(response.tokenUsage || response.cost) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {response.tokenUsage && (
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Tokens</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTokens(response.tokenUsage)}
                        </div>
                      </div>
                    </div>
                  )}

                  {response.cost && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Cost</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCost(response.cost.total)}
                          {response.cost.reasoning && response.cost.reasoning > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {` (+${formatCost(response.cost.reasoning)})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Copy Button */}
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                disabled={isCopying}
                className="hover:bg-muted"
              >
                <Copy className="w-4 h-4 mr-2" />
                {isCopying ? 'Copied!' : 'Copy Response'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Waiting for response...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}