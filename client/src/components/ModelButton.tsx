/**
 * ModelButton Component
 * Enhanced button for selecting AI models with improved card design
 * Based on design from other project with adaptations for ModelCompare
 * Author: Claude Code
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Zap, Brain, Eye } from 'lucide-react';
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

  // Determine if this is a premium/reasoning model
  const isPremium = model.capabilities.reasoning || 
                   model.pricing.reasoningPerMillion !== undefined ||
                   model.pricing.inputPerMillion > 10 ||
                   model.pricing.outputPerMillion > 30;

  // Get provider color for visual distinction
  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'OpenAI': 'bg-green-500',
      'Anthropic': 'bg-orange-500', 
      'Google': 'bg-blue-500',
      'DeepSeek': 'bg-purple-500',
      'xAI': 'bg-gray-700'
    };
    return colors[provider] || 'bg-gray-500';
  };

  // Estimate response speed based on model characteristics
  const getResponseSpeed = (model: AIModel) => {
    if (model.capabilities.reasoning || model.pricing.reasoningPerMillion) {
      return { speed: 'slow', estimate: '15-45s' };
    }
    if (model.name.toLowerCase().includes('mini') || model.name.toLowerCase().includes('flash')) {
      return { speed: 'fast', estimate: '2-5s' };
    }
    return { speed: 'moderate', estimate: '5-15s' };
  };

  const responseSpeed = getResponseSpeed(model);

  return (
    <Button
      variant="outline"
      className={`h-auto p-3 flex flex-col items-center gap-2 relative text-left transition-all ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''
      } ${isPremium ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''} 
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {isPremium && (
        <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs px-1 rounded-full">
          💰
        </div>
      )}
      
      {responseCount > 0 && (
        <div className="absolute -top-1 -left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
          {responseCount}
        </div>
      )}

      <div className="flex items-center gap-2 w-full">
        {isAnalyzing ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        ) : (
          <div className={`w-4 h-4 rounded-full flex-shrink-0 ${getProviderColor(model.provider)}`} />
        )}
        
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{model.name}</span>
          {model.capabilities.reasoning && (
            <Brain className="w-3 h-3 text-purple-600 flex-shrink-0" />
          )}
          {model.capabilities.multimodal && (
            <Eye className="w-3 h-3 text-green-600 flex-shrink-0" />
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 w-full space-y-1">
        <div className="flex justify-between">
          <span>In: ${model.pricing.inputPerMillion}/M</span>
          <span className="text-xs text-gray-500">{model.provider}</span>
        </div>
        <div>Out: ${model.pricing.outputPerMillion}/M</div>
        {model.pricing.reasoningPerMillion && (
          <div className="text-purple-600 dark:text-purple-400">
            Reasoning: ${model.pricing.reasoningPerMillion}/M
          </div>
        )}
        
        {showTiming && responseSpeed && (
          <div className="flex items-center gap-1 pt-1">
            <Clock className="w-3 h-3" />
            <span>Est:</span>
            <span className={`font-medium ${
              responseSpeed.speed === 'fast' ? 'text-green-600' : 
              responseSpeed.speed === 'moderate' ? 'text-amber-600' : 
              'text-red-600'
            }`}>
              {responseSpeed.estimate}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2 pt-1 text-xs">
          <span className="text-gray-500">{model.knowledgeCutoff}</span>
          {model.capabilities.functionCalling && (
            <span className="text-blue-600">🔧</span>
          )}
          {model.capabilities.streaming && (
            <Zap className="w-3 h-3 text-yellow-600" />
          )}
        </div>
      </div>
    </Button>
  );
}