/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T10:19:35Z
 * PURPOSE: Conversation log rendering Luigi agent/system/user messages with auto-scroll.
 * SRP/DRY check: Pass - purely presentational, no data fetching or state mutations.
 * shadcn/ui: Pass - uses shadcn Card, ScrollArea, Badge, Separator components.
 */

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { LuigiMessagePayload } from '@shared/luigi-types';

interface LuigiConversationLogProps {
  messages: LuigiMessagePayload[];
  className?: string;
}

const ROLE_COLORS: Record<LuigiMessagePayload['role'], string> = {
  system: 'bg-slate-500',
  orchestrator: 'bg-blue-600',
  'stage-lead': 'bg-emerald-600',
  agent: 'bg-purple-600',
  tool: 'bg-amber-600',
  user: 'bg-zinc-600',
};

export function LuigiConversationLog({ messages, className }: LuigiConversationLogProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Add defensive guard to prevent browser extension MutationObserver errors
  useEffect(() => {
    if (!bottomRef.current) return;
    try {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      // Silently ignore scroll errors (browser extensions can interfere)
      console.debug('Luigi conversation scroll error:', error);
    }
  }, [messages]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Conversation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <div
            className="space-y-4 p-4"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-lpignore="true"
            data-form-type="other"
          >
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet. Launch a Luigi run to begin.</p>
            )}
            {messages.map((message) => (
              <div key={message.messageId} className="space-y-2 rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={ROLE_COLORS[message.role] ?? 'bg-slate-500'}>
                      {message.role.toUpperCase()}
                    </Badge>
                    {message.agentId && (
                      <span className="text-xs text-muted-foreground">{message.agentId}</span>
                    )}
                    {message.stageId && (
                      <Badge variant="outline" className="text-xs">
                        {message.stageId}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
                  {message.content}
                </div>
                {message.reasoning && (
                  <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    <strong>Reasoning:</strong>
                    <br />
                    {message.reasoning}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
