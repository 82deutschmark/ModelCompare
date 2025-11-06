/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Render ARC stage progression timeline with status badges and timestamps.
 * SRP/DRY check: Pass - pure presentational component consuming provided stage map.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ARC_STAGES, type ArcRunSummary, type ArcStageId } from '@shared/arc-types';

interface ArcStageTimelineProps {
  stageMap: ArcRunSummary['stages'];
  currentStageId?: ArcStageId | null;
}

function statusVariant(status: string): { variant: 'secondary' | 'outline' | 'default' | 'destructive'; label: string } {
  switch (status) {
    case 'in-progress':
      return { variant: 'default', label: 'In Progress' };
    case 'completed':
      return { variant: 'secondary', label: 'Completed' };
    case 'blocked':
    case 'failed':
      return { variant: 'destructive', label: status === 'blocked' ? 'Blocked' : 'Failed' };
    default:
      return { variant: 'outline', label: 'Pending' };
  }
}

export function ArcStageTimeline({ stageMap, currentStageId }: ArcStageTimelineProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Reasoning Stages</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <ul className="space-y-2 p-4">
            {ARC_STAGES.map((stage) => {
              const snapshot = stageMap[stage.id as ArcStageId];
              const { variant, label } = statusVariant(snapshot?.status ?? 'idle');
              const isActive = currentStageId === stage.id;
              return (
                <li
                  key={stage.id}
                  className={cn(
                    'rounded-md border border-border/60 p-3 transition-colors',
                    isActive ? 'border-primary bg-primary/10' : 'bg-background'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-foreground">{stage.label}</div>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {snapshot?.summary ?? 'Awaiting agent analysis.'}
                  </div>
                  {snapshot?.blockingReason && (
                    <p className="mt-2 text-xs text-red-500">Blocker: {snapshot.blockingReason}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
