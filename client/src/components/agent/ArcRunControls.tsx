/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:07:00Z
 * PURPOSE: Provide pause/resume/cancel controls for ARC agent runs with status context.
 * SRP/DRY check: Pass - exposes control buttons for the current run without owning run state logic.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LuigiRunSummary } from '@shared/luigi-types';
import { Loader2, PauseCircle, PlayCircle, StopCircle } from 'lucide-react';

interface ArcRunControlsProps {
  run?: LuigiRunSummary;
  isMutating: boolean;
  onPause: () => Promise<void> | void;
  onResume: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
  onRefresh: () => void;
}

export function ArcRunControls({ run, isMutating, onPause, onResume, onCancel, onRefresh }: ArcRunControlsProps) {
  const status = run?.status ?? 'idle';
  const disabled = isMutating || !run;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-xs uppercase text-foreground">
          <span>Status:</span>
          <span className="font-semibold">{status}</span>
          {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" onClick={onRefresh} disabled={!run}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={onPause} disabled={disabled || status !== 'running'}>
            <PauseCircle className="mr-2 h-4 w-4" /> Pause
          </Button>
          <Button size="sm" variant="outline" onClick={onResume} disabled={disabled || status !== 'paused'}>
            <PlayCircle className="mr-2 h-4 w-4" /> Resume
          </Button>
          <Button size="sm" variant="destructive" onClick={onCancel} disabled={disabled}>
            <StopCircle className="mr-2 h-4 w-4" /> Cancel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use these controls to manage the orchestrator if it stalls while exploring transformations.
        </p>
      </CardContent>
    </Card>
  );
}
