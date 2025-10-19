// * Author: GPT-5 Codex
// * Date: 2025-10-17 and the 20:29 UTC
// * PURPOSE: Present live reasoning/content streams with optional auto-scroll guards for debate and related experiences.
// * SRP/DRY check: Pass - Component focuses on streaming visualization without leaking transport logic or consumer state.
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Brain, MessageSquare, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamingDisplayProps {
  reasoning: string;
  content: string;
  isStreaming: boolean;
  error: string | null;
  modelName?: string;
  modelProvider?: string;
  progress?: number;
  estimatedCost?: number;
  className?: string;
  disableAutoScroll?: boolean;
}

export const StreamingDisplay: React.FC<StreamingDisplayProps> = ({
  reasoning,
  content,
  isStreaming,
  error,
  modelName,
  modelProvider,
  progress = 0,
  estimatedCost,
  className,
  disableAutoScroll = false
}) => {
  const reasoningEndRef = useRef<HTMLDivElement>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  // Add defensive guards to prevent browser extension MutationObserver errors
  useEffect(() => {
    if (disableAutoScroll || !reasoningEndRef.current) return;
    try {
      reasoningEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      // Silently ignore scroll errors (browser extensions can interfere)
      console.debug('Scroll error:', error);
    }
  }, [reasoning, disableAutoScroll]);

  useEffect(() => {
    if (disableAutoScroll || !contentEndRef.current) return;
    try {
      contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      // Silently ignore scroll errors (browser extensions can interfere)
      console.debug('Scroll error:', error);
    }
  }, [content, disableAutoScroll]);

  const formatText = (text: string) => {
    if (!text) return '';

    // Basic markdown-like formatting for better readability
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <span>Live Response</span>
            {modelName && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center space-x-2">
                  <span className="font-normal text-muted-foreground">{modelName}</span>
                  {modelProvider && (
                    <Badge variant="outline" className="text-xs">
                      {modelProvider}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardTitle>

          <div className="flex items-center space-x-2">
            {isStreaming && progress > 0 && (
              <div className="text-xs text-muted-foreground">
                {Math.round(progress)}%
              </div>
            )}
            {estimatedCost && (
              <Badge variant="outline" className="text-xs">
                ~{estimatedCost.toFixed(4)} credits
              </Badge>
            )}
          </div>
        </div>

        {isStreaming && (
          <Progress value={progress} className="h-2" />
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reasoning Section */}
        {reasoning && (
          <>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <Label className="text-sm font-medium">Reasoning Process</Label>
                {isStreaming && (
                  <Badge variant="secondary" className="text-xs animate-pulse">
                    Thinking...
                  </Badge>
                )}
              </div>

              <div
            className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4 min-h-[100px] max-h-[300px] overflow-y-auto"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-lpignore="true"
            data-form-type="other"
          >
                <div
                  className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatText(reasoning) }}
                />
                <div ref={reasoningEndRef} />
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Content Section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <Label className="text-sm font-medium">Response</Label>
            {isStreaming && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                Generating...
              </Badge>
            )}
          </div>

          <div
            className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 min-h-[150px] max-h-[400px] overflow-y-auto"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-lpignore="true"
            data-form-type="other"
          >
            {error ? (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            ) : content ? (
              <div
                className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatText(content) }}
              />
            ) : isStreaming ? (
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating response...</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Response will appear here...
              </div>
            )}
            <div ref={contentEndRef} />
          </div>
        </div>

        {/* Status Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center space-x-4">
            <span>Status: {isStreaming ? 'Streaming' : error ? 'Error' : 'Complete'}</span>
            {reasoning && (
              <span>Reasoning: {reasoning.length.toLocaleString()} chars</span>
            )}
            {content && (
              <span>Response: {content.length.toLocaleString()} chars</span>
            )}
          </div>

          {isStreaming && (
            <div className="flex items-center space-x-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Live</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
