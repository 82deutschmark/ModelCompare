/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:06:00Z
 * PURPOSE: Display ARC agent conversation history with role-aware styling for orchestrator updates.
 * SRP/DRY check: Pass - renders log from props without side effects.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LuigiMessagePayload } from '@shared/luigi-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ArcConversationLogProps {
  messages: LuigiMessagePayload[];
  className?: string;
}

const ROLE_LABELS: Record<LuigiMessagePayload['role'], string> = {
  system: 'System',
  orchestrator: 'Orchestrator',
  'stage-lead': 'Stage Lead',
  agent: 'Agent',
  tool: 'Tool',
  user: 'User',
};

export function ArcConversationLog({ messages, className }: ArcConversationLogProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Agent Transcript</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <div className="space-y-4 p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No messages yet. Launch the ARC agent to see orchestrator reasoning and tool calls.
              </p>
            )}
            {messages.map((message) => (
              <article
                key={message.messageId}
                className={cn(
                  'rounded-md border border-border/60 bg-background p-3 shadow-sm transition-colors',
                  message.role === 'user' ? 'border-primary/60 bg-primary/10' : undefined
                )}
              >
                <header className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>
                    {ROLE_LABELS[message.role]}
                    {message.agentId ? ` · ${message.agentId}` : ''}
                    {message.stageId ? ` · ${message.stageId}` : ''}
                  </span>
                  <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                </header>
                <pre className="whitespace-pre-wrap text-sm text-foreground">{message.content}</pre>
                {message.reasoning && (
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">
                    {message.reasoning}
                  </pre>
                )}
              </article>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
