/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T10:20:19Z
 * PURPOSE: Luigi run control panel offering pause/resume/cancel actions and status summary.
 * SRP/DRY check: Pass - purely renders controls and metadata for a given run.
 * shadcn/ui: Pass - uses shadcn Card, Button, Badge components.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LuigiRunSummary } from '@shared/luigi-types';

interface LuigiRunControlsProps {
  run?: LuigiRunSummary;
  isMutating?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRefresh?: () => void;
}

export function LuigiRunControls({ run, isMutating, onPause, onResume, onCancel, onRefresh }: LuigiRunControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Run Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {run ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Run ID:</span>
              <span className="font-mono text-xs">{run.id}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="uppercase">{run.status}</Badge>
              {run.currentStageId && (
                <Badge variant="outline" className="text-xs">Stage: {run.currentStageId}</Badge>
              )}
              {typeof run.totalCostCents === 'number' && (
                <span className="text-xs text-muted-foreground">
                  Cost: ${(run.totalCostCents / 100).toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {new Date(run.updatedAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Launch a run to unlock controls.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!run || run.status !== 'running' || isMutating}
            onClick={onPause}
          >
            Pause
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!run || run.status !== 'paused' || isMutating}
            onClick={onResume}
          >
            Resume
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!run || run.status === 'completed' || run.status === 'cancelled' || isMutating}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="button" variant="ghost" disabled={!onRefresh || isMutating} onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
