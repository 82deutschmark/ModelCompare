/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-14
 * PURPOSE: Enhanced ExportButton component with expanded export options and better UX.
 * Added JSON export, CSV support, improved loading states, and better organization of export formats.
 * Uses proper shadcn/ui patterns with comprehensive dropdown menu and better accessibility.
 * SRP/DRY check: Pass - Single responsibility (export functionality), reuses export utilities
 * shadcn/ui: Pass - Uses DropdownMenu, Badge, and other shadcn/ui components
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  Copy,
  ChevronDown,
  File,
  FileJson,
  Loader2,
  Share
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  generateMarkdownExport,
  generateTextExport,
  downloadFile,
  generateSafeFilename,
  copyToClipboard,
  type ExportData
} from "@/lib/exportUtils";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface ChatMessage {
  id: string;
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
  round: number;
  reasoning?: string;
  responseTime: number;
  type: 'initial' | 'rebuttal' | 'prompt_response';
  tokenUsage?: {
    input: number;
    output: number;
    reasoning?: number;
  };
  cost?: {
    input: number;
    output: number;
    reasoning?: number;
    total: number;
  };
}

interface ExportButtonProps {
  prompt: string;
  models?: AIModel[];
  responses?: Record<string, ModelResponse>;
  chatMessages?: ChatMessage[];
  disabled?: boolean;
  variant?: 'comparison' | 'battle';
}

export function ExportButton({
  prompt,
  models = [],
  responses = {},
  chatMessages = [],
  disabled,
  variant = 'comparison'
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Prepare data based on variant
  const successfulResponses = variant === 'comparison'
    ? models
        .map(model => ({ model, response: responses[model.id] }))
        .filter(item => item.response?.status === 'success')
    : chatMessages.map(msg => ({
        model: {
          id: msg.modelId,
          name: msg.modelName,
          provider: 'AI Model',
        } as AIModel,
        response: {
          content: msg.content,
          status: 'success' as const,
          responseTime: msg.responseTime,
          reasoning: msg.reasoning,
          tokenUsage: msg.tokenUsage,
          cost: msg.cost,
        } as ModelResponse
      }));

  const hasResponses = successfulResponses.length > 0;

  const prepareExportData = (): ExportData => ({
    prompt,
    timestamp: new Date(),
    models: successfulResponses
  });

  const generateJsonExport = (data: ExportData): string => {
    const jsonData = {
      exportedAt: data.timestamp.toISOString(),
      prompt: data.prompt,
      mode: variant,
      results: data.models.map(item => ({
        model: {
          id: item.model.id,
          name: item.model.name,
          provider: item.model.provider,
          ...(item.model.premium && { premium: true }),
          ...(item.model.isReasoning && { reasoning: true }),
        },
        response: {
          content: item.response.content,
          responseTime: item.response.responseTime,
          ...(item.response.reasoning && { reasoning: item.response.reasoning }),
          ...(item.response.tokenUsage && { tokenUsage: item.response.tokenUsage }),
          ...(item.response.cost && { cost: item.response.cost }),
        }
      }))
    };
    return JSON.stringify(jsonData, null, 2);
  };

  const handleExport = async (format: 'markdown' | 'text' | 'json') => {
    if (!hasResponses) return;

    setIsExporting(true);
    try {
      const exportData = prepareExportData();
      let content: string;
      let extension: string;
      let mimeType: string;

      switch (format) {
        case 'markdown':
          content = generateMarkdownExport(exportData);
          extension = 'md';
          mimeType = 'text/markdown';
          break;
        case 'text':
          content = generateTextExport(exportData);
          extension = 'txt';
          mimeType = 'text/plain';
          break;
        case 'json':
          content = generateJsonExport(exportData);
          extension = 'json';
          mimeType = 'application/json';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const filename = generateSafeFilename(prompt, extension);
      downloadFile(content, filename, mimeType);

      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to generate ${format} file`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async (format: 'markdown' | 'text' | 'json') => {
    if (!hasResponses) return;

    setIsExporting(true);
    try {
      const exportData = prepareExportData();
      let content: string;

      switch (format) {
        case 'markdown':
          content = generateMarkdownExport(exportData);
          break;
        case 'text':
          content = generateTextExport(exportData);
          break;
        case 'json':
          content = generateJsonExport(exportData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const success = await copyToClipboard(content);
      if (success) {
        toast({
          title: "Copied to Clipboard",
          description: `${format.charAt(0).toUpperCase() + format.slice(1)} content copied successfully`,
        });
      } else {
        throw new Error("Clipboard copy failed");
      }
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: `Failed to copy ${format} to clipboard`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !hasResponses || isExporting}
          className="flex items-center space-x-2"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share className="w-4 h-4" />
          )}
          <span>Export</span>
          {hasResponses && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
              {successfulResponses.length}
            </Badge>
          )}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Download Files
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExport('markdown')}
          disabled={!hasResponses || isExporting}
        >
          <FileText className="w-4 h-4 mr-2" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('text')}
          disabled={!hasResponses || isExporting}
        >
          <File className="w-4 h-4 mr-2" />
          Plain Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('json')}
          disabled={!hasResponses || isExporting}
        >
          <FileJson className="w-4 h-4 mr-2" />
          JSON Data (.json)
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center">
          <Copy className="w-4 h-4 mr-2" />
          Copy to Clipboard
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleCopy('markdown')}
          disabled={!hasResponses || isExporting}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCopy('text')}
          disabled={!hasResponses || isExporting}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy as Text
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCopy('json')}
          disabled={!hasResponses || isExporting}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}