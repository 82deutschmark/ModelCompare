/**
 * Author: Grok 4 Fast
 * Date: 2025-09-28 12:15:52
 * PURPOSE: Redesigned ModelButton component using shadcn/ui components for consistent design.
 * Implements Card, Badge, Tooltip, and other shadcn/ui primitives for better UX.
 * Uses new centralized model configuration with color and premium status.
 * SRP/DRY check: Pass - Single responsibility (model selection UI), reuses shadcn/ui components
 * shadcn/ui: Pass - Uses Card, Badge, Tooltip, and other shadcn/ui components
 * Improvements: Added overflow-hidden to prevent text overrun, flex-1 and truncate with min-w-0 for better text handling in compact layouts.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Crown, Zap, Clock, DollarSign, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIModel } from '@/types/ai-models';

interface ModelButtonProps {
  model: AIModel;
  isSelected: boolean;
  isAnalyzing?: boolean;
  responseCount?: number;
  onToggle: (modelId: string) => void;
  disabled?: boolean;
  showTiming?: boolean;
}

export function ModelButton({
  model,
  isSelected,
  isAnalyzing = false,
  responseCount = 0,
  onToggle,
  disabled = false,
  showTiming = true
}: ModelButtonProps) {
  const handleClick = () => {
    if (!disabled) {
      onToggle(model.id);
    }
  };

  // Get provider icon from model configuration
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden",
              isSelected && "ring-2 ring-primary ring-offset-2",
              isAnalyzing && "animate-pulse",
              disabled && "opacity-50 cursor-not-allowed",
              "border-2 min-h-[120px]", // Increased minimum height for better visibility
              isSelected ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/20"
            )}
            onClick={handleClick}
          >
            <CardContent className="p-4 space-y-3"> {/* Increased padding and spacing */}
              {/* Header Row with full model name visibility */}
              <CardHeader className="p-0 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0"> {/* Slightly larger avatar */}
                      <AvatarFallback className={cn("text-sm font-bold text-white", model.color)}>
                        {getProviderIcon(model.provider)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight mb-1"> {/* Removed truncate, allow wrapping */}
                        {model.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {model.provider}
                      </p>
                    </div>
                    {model.premium && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : responseCount > 0 ? (
                      <Badge variant="default" className="px-2 py-0.5 text-xs">
                        {responseCount}
                      </Badge>
                    ) : isSelected ? (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              {/* Enhanced Info Rows with better spacing */}
              <div className="space-y-2">
                {/* Speed and Reasoning Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {model.isReasoning && <Brain className="w-3 h-3 text-blue-500" />}
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="capitalize text-muted-foreground">
                      {model.responseTime?.speed || 'Standard'}
                    </span>
                  </div>
                </div>

                {/* Cost Row - Full visibility */}
                <div className="flex items-center space-x-2 text-xs">
                  <DollarSign className="w-3 h-3 text-green-600" />
                  <span className="text-muted-foreground">
                    <span className="font-medium">${model.cost?.input || '0'}</span>
                    <span className="mx-1">/</span>
                    <span className="font-medium">${model.cost?.output || '0'}</span>
                    <span className="ml-1">per M</span>
                  </span>
                </div>

                {/* Optional Timing Row */}
                {showTiming && model.responseTime?.estimate && (
                  <div className="flex items-center space-x-2 text-xs">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="text-muted-foreground">
                      ~{model.responseTime.estimate}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>

        <TooltipContent side="right" className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">{model.name}</div>
            <div className="text-sm text-muted-foreground">{model.provider}</div>
            {model.contextWindow && (
              <div className="text-sm">Context: {(model.contextWindow / 1000).toFixed(0)}k tokens</div>
            )}
            {model.releaseDate && (
              <div className="text-sm">Released: {model.releaseDate}</div>
            )}
            <div className="text-sm">
              Input: {model.cost?.input}/M • Output: {model.cost?.output}/M
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}