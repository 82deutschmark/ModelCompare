// * Author: gpt-5-codex
// * Date: 2025-10-17 19:26 UTC
// * PURPOSE: Extend debate export hook to include jury annotations and phase metadata in outputs.
// * SRP/DRY check: Pass - Keeps export responsibilities isolated with richer payload support.
/**
 * Custom hook for managing debate export functionality
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateMarkdownExport, downloadFile, generateSafeFilename, copyToClipboard, type ExportData } from '@/lib/exportUtils';
import type { AIModel } from '@/types/ai-models';
import type { DebatePhase, JuryAnnotationsMap } from '@/hooks/useDebateSession';

export interface DebateExportState {
  exportMarkdown: (params: DebateExportParams) => void;
  copyToClipboard: (params: DebateExportParams) => Promise<boolean>;
}

export interface DebateExportParams {
  messages: any[];
  models: AIModel[];
  selectedTopic: string;
  customTopic: string;
  useCustomTopic: boolean;
  topicText?: string;
  juryAnnotations?: JuryAnnotationsMap;
  phases?: DebatePhase[];
  currentPhase?: DebatePhase;
}

export function useDebateExport(): DebateExportState {
  const { toast } = useToast();

  // Shared helper function to build export data
  const buildExportData = useCallback((params: DebateExportParams): ExportData => {
    const {
      messages,
      models,
      customTopic,
      useCustomTopic,
      selectedTopic,
      topicText,
      juryAnnotations,
      phases,
      currentPhase,
    } = params;

    const resolvedTopic = topicText?.trim()
      ? topicText
      : useCustomTopic
        ? customTopic
        : selectedTopic;
    const topicLabel = resolvedTopic || 'Debate Topic';

    return {
      prompt: `Debate Topic: ${topicLabel}`,
      timestamp: new Date(),
      models: messages
        .map(msg => ({
          model: models.find(m => m.id === msg.modelId) as AIModel,
          response: {
            status: 'success' as const,
            content: msg.content,
            reasoning: msg.reasoning,
            responseTime: msg.responseTime,
            tokenUsage: msg.tokenUsage,
            cost: msg.cost,
          },
        }))
        .filter(item => item.model),
      jury: juryAnnotations
        ? {
            annotations: juryAnnotations,
            phases: phases ?? [],
            currentPhase: currentPhase ?? ('OPENING_STATEMENTS' as DebatePhase),
          }
        : undefined,
    };
  }, []);

  const exportMarkdown = useCallback((params: DebateExportParams) => {
    const { messages, models, selectedTopic, customTopic, useCustomTopic, topicText } = params;

    if (messages.length === 0) return;

    const resolvedTopic = topicText?.trim()
      ? topicText
      : useCustomTopic
        ? customTopic
        : selectedTopic;
    const topicLabel = resolvedTopic || 'debate';

    const exportData = buildExportData(params);

    const markdown = generateMarkdownExport(exportData);
    const filename = generateSafeFilename(`debate-${topicLabel}`, 'md');
    downloadFile(markdown, filename, 'text/markdown');

    toast({
      title: "Debate Exported",
      description: "Downloaded as markdown file",
    });
  }, [buildExportData, toast]);

  const copyToClipboardExport = useCallback(async (params: DebateExportParams): Promise<boolean> => {
    const { messages, models, selectedTopic, customTopic, useCustomTopic, topicText } = params;

    if (messages.length === 0) return false;

    const resolvedTopic = topicText?.trim()
      ? topicText
      : useCustomTopic
        ? customTopic
        : selectedTopic;
    const topicLabel = resolvedTopic || 'debate';

    const exportData = buildExportData(params);

    const markdown = generateMarkdownExport(exportData);
    const success = await copyToClipboard(markdown);

    if (success) {
      toast({
        title: "Copied to Clipboard",
        description: `Debate exported as markdown (${topicLabel})`,
      });
    } else {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }

    return success;
  }, [buildExportData, toast]);

  return {
    exportMarkdown,
    copyToClipboard: copyToClipboardExport,
  };
}
