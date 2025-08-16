/**
 * Export Button Component - Provides download options for model responses
 * 
 * This component renders export options for downloading model comparison
 * results in various formats (Markdown, Text) with dropdown menu interface.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Copy, ChevronDown } from "lucide-react";
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

  const handleExportMarkdown = async () => {
    if (!hasResponses) return;
    
    setIsExporting(true);
    try {
      const exportData = prepareExportData();
      const content = generateMarkdownExport(exportData);
      const filename = generateSafeFilename(prompt, 'md');
      
      downloadFile(content, filename, 'text/markdown');
      
      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate markdown file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportText = async () => {
    if (!hasResponses) return;
    
    setIsExporting(true);
    try {
      const exportData = prepareExportData();
      const content = generateTextExport(exportData);
      const filename = generateSafeFilename(prompt, 'txt');
      
      downloadFile(content, filename, 'text/plain');
      
      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate text file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!hasResponses) return;
    
    setIsExporting(true);
    try {
      const exportData = prepareExportData();
      const content = generateMarkdownExport(exportData);
      
      const success = await copyToClipboard(content);
      if (success) {
        toast({
          title: "Copied to Clipboard",
          description: "Markdown content copied successfully",
        });
      } else {
        throw new Error("Clipboard copy failed");
      }
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy markdown to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = async () => {
    if (!hasResponses) return;
    
    setIsExporting(true);
    try {
      const exportData = prepareExportData();
      const content = generateTextExport(exportData);
      
      const success = await copyToClipboard(content);
      if (success) {
        toast({
          title: "Copied to Clipboard",
          description: "Text content copied successfully",
        });
      } else {
        throw new Error("Clipboard copy failed");
      }
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy text to clipboard",
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
          className="flex items-center space-x-1"
        >
          {isExporting ? (
            <div className="w-3 h-3 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span className="text-xs">Export</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportMarkdown} disabled={!hasResponses || isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          Download as Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportText} disabled={!hasResponses || isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          Download as Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyMarkdown} disabled={!hasResponses || isExporting}>
          <Copy className="w-4 h-4 mr-2" />
          Copy Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyText} disabled={!hasResponses || isExporting}>
          <Copy className="w-4 h-4 mr-2" />
          Copy Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}