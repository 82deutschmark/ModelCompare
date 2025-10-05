/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-14
 * PURPOSE: Redesigned ModelButton component using shadcn/ui components for consistent design.
 * Implements Card, Badge, Tooltip, and other shadcn/ui primitives for better UX.
 * Uses new centralized model configuration with color and premium status.
 * SRP/DRY check: Pass - Single responsibility (model selection UI), reuses shadcn/ui components
 * shadcn/ui: Pass - Uses Card, Badge, Tooltip, and other shadcn/ui components
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
              "relative cursor-pointer transition-all duration-200 hover:shadow-md",
              isSelected && "ring-2 ring-primary ring-offset-2",
              isAnalyzing && "animate-pulse",
              disabled && "opacity-50 cursor-not-allowed",
              "border-2",
              isSelected ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/20"
            )}
            onClick={handleClick}
          >
            <CardContent className="p-3">
              {/* Compact Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className={cn("text-xs font-bold text-white", model.color)}>
                      {getProviderIcon(model.provider)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-sm truncate">{model.name}</h3>
                  {model.premium && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center">
                  {isAnalyzing ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  ) : responseCount > 0 ? (
                    <Badge variant="default" className="px-1 py-0 text-xs h-4">
                      {responseCount}
                    </Badge>
                  ) : isSelected ? (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  ) : null}
                </div>
              </div>

              {/* Compact Info Row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  {model.isReasoning && <Brain className="w-3 h-3 text-blue-500" />}
                  <Zap className="w-3 h-3" />
                  <span className="capitalize">{model.responseTime?.speed}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-3 h-3" />
                  <span>{model.cost?.input}/{model.cost?.output}M</span>
                </div>
              </div>

              {/* Optional Timing Row */}
              {showTiming && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{model.responseTime?.estimate}</span>
                </div>
              )}
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