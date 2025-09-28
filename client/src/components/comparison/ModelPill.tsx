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
    default: "px-3 py-2 gap-2",
    compact: "px-2 py-1.5 gap-1.5",
    minimal: "px-2 py-1 gap-1"
  };

  const avatarSizes = {
    default: "h-6 w-6",
    compact: "h-5 w-5",
    minimal: "h-4 w-4"
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
              "font-medium truncate max-w-32",
              variant === 'default' && "text-sm",
              variant === 'compact' && "text-xs",
              variant === 'minimal' && "text-xs max-w-20"
            )}>
              {model.name}
            </span>

            {/* Status Indicators */}
            <div className="flex items-center gap-1">
              {model.premium && variant !== 'minimal' && (
                <Crown className="w-3 h-3 text-yellow-500" />
              )}
              {model.isReasoning && variant !== 'minimal' && (
                <Brain className="w-3 h-3 text-blue-500" />
              )}
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              ) : hasResponse ? (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full",
                variant === 'default' && "h-4 w-4",
                variant === 'compact' && "h-3 w-3",
                variant === 'minimal' && "h-3 w-3"
              )}
              onClick={handleRemove}
            >
              <X className="w-3 h-3" />
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