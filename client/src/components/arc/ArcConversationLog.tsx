/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Render ARC agent conversation transcript with role-aware styling and
 *          lightweight metadata badges.
 * SRP/DRY check: Pass - purely presentational component mapping messages to UI.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ArcMessagePayload } from '@shared/arc-types';

interface ArcConversationLogProps {
  messages: ArcMessagePayload[];
}

const ROLE_LABEL: Record<string, string> = {
  system: 'System',
  researcher: 'ARC Agent',
  assistant: 'Assistant',
  tool: 'Tool',
  user: 'User',
};

export function ArcConversationLog({ messages }: ArcConversationLogProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Conversation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <ul className="space-y-3 p-4">
            {messages.map((message) => (
              <li key={message.id} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Badge variant="secondary">{ROLE_LABEL[message.role] ?? message.role}</Badge>
                    {message.stageId && <span className="text-xs text-muted-foreground">Stage: {message.stageId}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {message.content}
                </div>
                {message.reasoning && (
                  <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    {message.reasoning}
                  </div>
                )}
              </li>
            ))}
            {messages.length === 0 && (
              <li className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Launch an ARC agent run to see the reasoning transcript.
              </li>
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
