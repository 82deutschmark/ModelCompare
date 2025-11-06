/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Provide lightweight controls for managing ARC agent runs (refresh/cancel).
 * SRP/DRY check: Pass - component only renders buttons for provided callbacks.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ArcRunSummary } from '@shared/arc-types';

interface ArcRunControlsProps {
  run?: ArcRunSummary;
  isCancelling?: boolean;
  onCancel: () => void;
  onRefresh: () => void;
}

export function ArcRunControls({ run, isCancelling, onCancel, onRefresh }: ArcRunControlsProps) {
  const canCancel = run && ['running', 'awaiting_input'].includes(run.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run Controls</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button variant="secondary" onClick={onRefresh} disabled={!run}>
          Refresh Status
        </Button>
        <Button
          variant="destructive"
          onClick={onCancel}
          disabled={!canCancel || Boolean(isCancelling)}
        >
          {isCancelling ? 'Cancelling…' : 'Cancel Run'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Status: {run ? run.status : 'No run active'}
        </p>
      </CardContent>
    </Card>
  );
}
