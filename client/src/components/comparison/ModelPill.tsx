/**
 * Author: Claude Sonnet 4
 * Date: 2025-09-28
 * PURPOSE: Compact model pill component for displaying selected models inline.
 *          Replaces large ModelButton cards with small, elegant badges that show
 *          essential model info: name, provider, status. Includes remove action.
 *          Uses provider color coding and shadcn/ui Badge patterns.
 * SRP/DRY check: Pass - Single responsibility (compact model display), reuses Badge/Tooltip
 * shadcn/ui: Pass - Uses Badge, Tooltip, Button components
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  // Get provider base color for consistent theming
  const getProviderColorClasses = (provider: string) => {
    const providerColors: Record<string, { bg: string; border: string; avatar: string }> = {
      'OpenAI': {
        bg: 'bg-emerald-50/50',
        border: 'border-emerald-500/30 hover:border-emerald-500/50',
        avatar: 'bg-emerald-500'
      },
      'Anthropic': {
        bg: 'bg-indigo-50/50',
        border: 'border-indigo-500/30 hover:border-indigo-500/50',
        avatar: 'bg-indigo-500'
      },
      'Gemini': {
        bg: 'bg-teal-50/50',
        border: 'border-teal-500/30 hover:border-teal-500/50',
        avatar: 'bg-teal-500'
      },
      'DeepSeek': {
        bg: 'bg-cyan-50/50',
        border: 'border-cyan-500/30 hover:border-cyan-500/50',
        avatar: 'bg-cyan-500'
      },
      'OpenRouter': {
        bg: 'bg-slate-50/50',
        border: 'border-slate-500/30 hover:border-slate-500/50',
        avatar: 'bg-slate-500'
      },
    };
    return providerColors[provider] || {
      bg: 'bg-gray-50/50',
      border: 'border-gray-500/30 hover:border-gray-500/50',
      avatar: 'bg-gray-500'
    };
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
    minimal: "px-1.5 py-1 gap-1"
  };

  const providerColors = getProviderColorClasses(model.provider);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center border-2 transition-all duration-200 cursor-pointer",
              "hover:shadow-sm",
              isLoading && "animate-pulse",
              hasResponse && "border-green-500/50 bg-green-50/50",
              !hasResponse && providerColors.bg,
              !hasResponse && providerColors.border,
              model.color && `hover:border-${model.color.replace('bg-', '')}-500/50`,
              pillStyles[variant]
            )}
            onClick={handleClick}
          >
            {/* Provider Color Dot */}
            <div className={cn(
              "rounded-full",
              model.color || providerColors.avatar,
              variant === 'default' && "w-3 h-3",
              variant === 'compact' && "w-2.5 h-2.5",
              variant === 'minimal' && "w-2 h-2"
            )} />

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
                variant === 'default' && "h-5 w-5",
                variant === 'compact' && "h-4 w-4",
                variant === 'minimal' && "h-3.5 w-3.5"
              )}
              onClick={handleRemove}
            >
              <X className={cn(
                variant === 'default' && "w-3 h-3",
                variant === 'compact' && "w-2.5 h-2.5",
                variant === 'minimal' && "w-2 h-2"
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