/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:05:30Z
 * PURPOSE: Render ARC agent stage progression with ARC-specific naming and status indicators.
 * SRP/DRY check: Pass - purely presentational timeline driven by provided run summary data.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LuigiRunSummary, LuigiStageId } from '@shared/luigi-types';
import { LUIGI_STAGES } from '@shared/luigi-types';
import { cn } from '@/lib/utils';

interface ArcStageTimelineProps {
  stageMap: LuigiRunSummary['stages'];
  currentStageId?: LuigiStageId | null;
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
        <CardTitle>ARC Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <ul className="space-y-2 p-4">
            {LUIGI_STAGES.map((stage) => {
              const snapshot = stageMap[stage.id as LuigiStageId];
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
                    {snapshot?.startedAt && (
                      <span className="mr-2">Started: {new Date(snapshot.startedAt).toLocaleString()}</span>
                    )}
                    {snapshot?.completedAt && (
                      <span>Completed: {new Date(snapshot.completedAt).toLocaleString()}</span>
                    )}
                    {!snapshot?.startedAt && 'Awaiting activation'}
                  </div>
                  {snapshot?.blockingReason && (
                    <p className="mt-2 text-xs text-red-500">{snapshot.blockingReason}</p>
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
