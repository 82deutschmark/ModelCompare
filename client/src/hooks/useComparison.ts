/*
 * Author: Cascade (GPT-5 medium reasoning)
 * Date: 2025-09-27T16:12:03-04:00
 * PURPOSE: Custom hook for managing AI model comparison state and API interactions.
 *          Extracts all comparison logic from the massive home.tsx component.
 *          Handles model selection, API calls, response management, and loading states.
 * SRP/DRY check: Pass - Single responsibility for comparison state management
 * shadcn/ui: Pass - No UI components, pure logic hook
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ModelResponse } from '@/types/ai-models';

export interface ComparisonState {
  selectedModels: string[];
  responses: Record<string, ModelResponse>;
  loadingModels: Set<string>;
  completedModels: Set<string>;
}

export interface ComparisonActions {
  setSelectedModels: React.Dispatch<React.SetStateAction<string[]>>;
  toggleModel: (modelId: string) => void;
  selectAllModels: (modelIds: string[]) => void;
  clearAllModels: () => void;
  startComparison: (prompt: string) => void;
  retryModel: (modelId: string, prompt: string) => void;
  resetComparison: () => void;
}

export interface ComparisonStatus {
  isComparing: boolean;
  hasResponses: boolean;
  canStartComparison: (prompt: string) => boolean;
}

export function useComparison() {
  const { toast } = useToast();
  
  // State management
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({});
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set());
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());

  // Individual model response mutation for parallel requests
  const modelResponseMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelId: string }) => {
      const response = await apiRequest('POST', '/api/models/respond', data);
      const responseData = await response.json() as ModelResponse;
      return { modelId: data.modelId, response: responseData };
    },
    onSuccess: (data) => {
      // Add missing status field that ResponseCard expects
      const responseWithStatus = { ...data.response, status: 'success' as const };
      setResponses(prev => ({ ...prev, [data.modelId]: responseWithStatus }));
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.modelId);
        return newSet;
      });
      setCompletedModels(prev => new Set([...Array.from(prev), data.modelId]));
      
      toast({
        title: `Model Responded`,
        description: `Response received in ${(data.response.responseTime / 1000).toFixed(1)}s`,
      });
    },
    onError: (error, variables) => {
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.modelId);
        return newSet;
      });
      
      // Set error response with proper status field
      setResponses(prev => ({
        ...prev,
        [variables.modelId]: {
          content: '',
          status: 'error' as const,
          responseTime: 0,
          error: error.message
        }
      }));
      
      toast({
        title: `Model Failed`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actions
  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const selectAllModels = (modelIds: string[]) => {
    setSelectedModels(modelIds);
  };

  const clearAllModels = () => {
    setSelectedModels([]);
  };

  const resetComparison = () => {
    setResponses({});
    setLoadingModels(new Set());
    setCompletedModels(new Set());
  };

  const canStartComparison = (prompt: string): boolean => {
    return prompt.trim().length > 0 && selectedModels.length > 0 && loadingModels.size === 0;
  };

  const startComparison = (prompt: string) => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please enter a prompt to compare models.",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "Select models",
        description: "Please select at least one model to compare.",
        variant: "destructive",
      });
      return;
    }

    // Reset state for new comparison
    resetComparison();
    setLoadingModels(new Set(selectedModels));
    
    // Start all model requests in parallel for incremental rendering
    selectedModels.forEach(modelId => {
      modelResponseMutation.mutate({ prompt, modelId });
    });
    
    toast({
      title: "Comparison Started",
      description: `Requesting responses from ${selectedModels.length} models...`,
    });
  };

  const retryModel = (modelId: string, prompt: string) => {
    if (!prompt.trim()) return;
    
    setLoadingModels(prev => new Set([...Array.from(prev), modelId]));
    setCompletedModels(prev => {
      const newSet = new Set(prev);
      newSet.delete(modelId);
      return newSet;
    });
    
    // Clear previous response
    setResponses(prev => {
      const newResponses = { ...prev };
      delete newResponses[modelId];
      return newResponses;
    });
    
    modelResponseMutation.mutate({ prompt, modelId });
  };

  // State object
  const state: ComparisonState = {
    selectedModels,
    responses,
    loadingModels,
    completedModels,
  };

  // Actions object
  const actions: ComparisonActions = {
    setSelectedModels,
    toggleModel,
    selectAllModels,
    clearAllModels,
    startComparison,
    retryModel,
    resetComparison,
  };

  // Status object
  const status: ComparisonStatus = {
    isComparing: loadingModels.size > 0,
    hasResponses: Object.keys(responses).length > 0,
    canStartComparison,
  };

  return {
    state,
    actions,
    status,
  };
}
