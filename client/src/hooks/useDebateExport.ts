/**
 * Custom hook for managing debate export functionality
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Handle debate export operations including markdown generation and clipboard copying
 * SRP/DRY check: Pass - Single responsibility for debate export functionality, no duplication with other export hooks
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateMarkdownExport, generateTextExport, downloadFile, generateSafeFilename, copyToClipboard, type ExportData } from '@/lib/exportUtils';
import type { AIModel } from '@/types/ai-models';

export interface DebateExportState {
  exportMarkdown: (params: {
    messages: any[];
    models: AIModel[];
    selectedTopic: string;
    customTopic: string;
    useCustomTopic: boolean;
  }) => void;
  copyToClipboard: (params: {
    messages: any[];
    models: AIModel[];
    selectedTopic: string;
    customTopic: string;
    useCustomTopic: boolean;
  }) => Promise<boolean>;
}

export function useDebateExport(): DebateExportState {
  const { toast } = useToast();

  // Shared helper function to build export data
  const buildExportData = useCallback((
    messages: any[],
    models: AIModel[],
    selectedTopic: string,
    customTopic: string,
    useCustomTopic: boolean
  ): ExportData => {
    const topicText = useCustomTopic
      ? customTopic
      : 'Custom Topic'; // This will be resolved by the calling component

    return {
      prompt: `Debate Topic: ${topicText}`,
      timestamp: new Date(),
      models: messages.map(msg => ({
        model: models.find(m => m.id === msg.modelId) as AIModel,
        response: {
          status: 'success' as const,
          content: msg.content,
          reasoning: msg.reasoning,
          responseTime: msg.responseTime,
          tokenUsage: msg.tokenUsage,
          cost: msg.cost,
        }
      })).filter(item => item.model)
    };
  }, []);

  const exportMarkdown = useCallback((params: {
    messages: any[];
    models: AIModel[];
    selectedTopic: string;
    customTopic: string;
    useCustomTopic: boolean;
  }) => {
    const { messages, models, selectedTopic, customTopic, useCustomTopic } = params;

    if (messages.length === 0) return;

    const topicText = useCustomTopic
      ? customTopic
      : 'Custom Topic'; // This will be resolved by the calling component

    const exportData = buildExportData(messages, models, selectedTopic, customTopic, useCustomTopic);

    const markdown = generateMarkdownExport(exportData);
    const filename = generateSafeFilename(`debate-${topicText}`, 'md');
    downloadFile(markdown, filename, 'text/markdown');

    toast({
      title: "Debate Exported",
      description: "Downloaded as markdown file",
    });
  }, [buildExportData, toast]);

  const copyToClipboardExport = useCallback(async (params: {
    messages: any[];
    models: AIModel[];
    selectedTopic: string;
    customTopic: string;
    useCustomTopic: boolean;
  }): Promise<boolean> => {
    const { messages, models, selectedTopic, customTopic, useCustomTopic } = params;

    if (messages.length === 0) return false;

    const topicText = useCustomTopic
      ? customTopic
      : 'Custom Topic'; // This will be resolved by the calling component

    const exportData = buildExportData(messages, models, selectedTopic, customTopic, useCustomTopic);

    const markdown = generateMarkdownExport(exportData);
    const success = await copyToClipboard(markdown);

    if (success) {
      toast({
        title: "Copied to Clipboard",
        description: "Debate exported as markdown",
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
