/**
 * Author: Claude Sonnet 4
 * Date: 2025-09-28
 * PURPOSE: Compact model pill component for displaying selected models inline.
 *          Replaces large ModelButton cards with small, elegant badges that show
 *          essential model info: name, provider, status. Includes remove action.
 *          Uses provider color coding and shadcn/ui Badge patterns.
 * SRP/DRY check: Pass - Single responsibility (compact model display), reuses Badge/Tooltip
 * shadcn/ui: Pass - Uses Badge, Tooltip, Avatar components
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Loader2, Crown, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIModel } from '@/types/ai-models';

interface ModelPillProps {
  model: AIModel;
  isLoading?: boolean;
  hasResponse?: boolean;
  onRemove: (modelId: string) => void;
  onClick?: (modelId: string) => void;
  variant?: 'default' | 'compact' | 'minimal';
}

export function ModelPill({
  model,
  isLoading = false,
  hasResponse = false,
  onRemove,
  onClick,
  variant = 'default'
}: ModelPillProps) {

  // Get provider icon abbreviation
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

  // Handle pill click
  const handleClick = () => {
    if (onClick && !isLoading) {
      onClick(model.id);
    }
  };

  // Handle remove click
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(model.id);
  };

  // Variant styles
  const pillStyles = {
    default: "px-2 py-1.5 gap-1.5",
    compact: "px-1.5 py-1 gap-1",
    minimal: "px-1 py-0.5 gap-0.5"
  };

  const avatarSizes = {
    default: "h-5 w-5",
    compact: "h-4 w-4",
    minimal: "h-3 w-3"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center border-2 transition-all duration-200 cursor-pointer",
              "hover:shadow-sm hover:border-primary/50",
              isLoading && "animate-pulse",
              hasResponse && "border-green-500/50 bg-green-50/50",
              model.color && `border-${model.color}-500/30`,
              pillStyles[variant]
            )}
            onClick={handleClick}
          >
            {/* Provider Avatar */}
            <Avatar className={avatarSizes[variant]}>
              <AvatarFallback className={cn(
                "text-xs font-bold text-white",
                model.color,
                variant === 'minimal' && "text-[10px]"
              )}>
                {getProviderIcon(model.provider)}
              </AvatarFallback>
            </Avatar>

            {/* Model Name */}
            <span className={cn(
              "font-medium truncate",
              variant === 'default' && "text-xs max-w-24",
              variant === 'compact' && "text-xs max-w-20",
              variant === 'minimal' && "text-xs max-w-16"
            )}>
              {model.name}
            </span>

            {/* Status Indicators */}
            <div className="flex items-center gap-1">
              {model.premium && (
                <Crown className={cn(
                  "text-yellow-500",
                  variant === 'default' && "w-3 h-3",
                  variant === 'compact' && "w-2.5 h-2.5",
                  variant === 'minimal' && "w-2 h-2"
                )} />
              )}
              {model.isReasoning && (
                <Brain className={cn(
                  "text-blue-500",
                  variant === 'default' && "w-3 h-3",
                  variant === 'compact' && "w-2.5 h-2.5",
                  variant === 'minimal' && "w-2 h-2"
                )} />
              )}
              {isLoading ? (
                <Loader2 className={cn(
                  "animate-spin text-primary",
                  variant === 'default' && "w-2.5 h-2.5",
                  variant === 'compact' && "w-2 h-2",
                  variant === 'minimal' && "w-1.5 h-1.5"
                )} />
              ) : hasResponse ? (
                <div className={cn(
                  "rounded-full bg-green-500",
                  variant === 'default' && "w-2 h-2",
                  variant === 'compact' && "w-1.5 h-1.5",
                  variant === 'minimal' && "w-1 h-1"
                )} />
              ) : (
                <div className={cn(
                  "rounded-full bg-muted-foreground/30",
                  variant === 'default' && "w-2 h-2",
                  variant === 'compact' && "w-1.5 h-1.5",
                  variant === 'minimal' && "w-1 h-1"
                )} />
              )}
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full",
                variant === 'default' && "h-3.5 w-3.5",
                variant === 'compact' && "h-3 w-3",
                variant === 'minimal' && "h-2.5 w-2.5"
              )}
              onClick={handleRemove}
            >
              <X className={cn(
                variant === 'default' && "w-2.5 h-2.5",
                variant === 'compact' && "w-2 h-2",
                variant === 'minimal' && "w-1.5 h-1.5"
              )} />
            </Button>
          </Badge>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">{model.name}</div>
            <div className="text-sm text-muted-foreground">{model.provider}</div>
            {model.contextWindow && (
              <div className="text-sm">Context: {(model.contextWindow / 1000).toFixed(0)}k tokens</div>
            )}
            {model.cost && (
              <div className="text-sm">
                ${model.cost.input}/M input • ${model.cost.output}/M output
              </div>
            )}
            {model.responseTime?.estimate && (
              <div className="text-sm">~{model.responseTime.estimate}</div>
            )}
            <div className="text-xs text-muted-foreground border-t pt-1">
              Click for details • X to remove
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Variant exports for convenience
export const ModelPillCompact = (props: Omit<ModelPillProps, 'variant'>) => (
  <ModelPill {...props} variant="compact" />
);

export const ModelPillMinimal = (props: Omit<ModelPillProps, 'variant'>) => (
  <ModelPill {...props} variant="minimal" />
);