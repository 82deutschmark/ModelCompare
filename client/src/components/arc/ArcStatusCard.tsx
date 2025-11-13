/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Summarize ARC run metrics including status, message count, and artifacts.
 * SRP/DRY check: Pass - display-only component without side effects.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { ArcRunSummary } from '@shared/arc-types';

interface ArcStatusCardProps {
  run?: ArcRunSummary;
  isLoading: boolean;
  messageCount: number;
  artifactCount: number;
}

export function ArcStatusCard({ run, isLoading, messageCount, artifactCount }: ArcStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Run Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs uppercase">
            <Loader2 className="h-4 w-4 animate-spin" /> Syncing run state…
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className="font-medium text-foreground">{run?.status ?? 'No run'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Messages</span>
          <span className="font-medium text-foreground">{messageCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Artifacts</span>
          <span className="font-medium text-foreground">{artifactCount}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {run ? `Updated ${new Date(run.updatedAt).toLocaleString()}` : 'Launch a run to begin tracking.'}
        </div>
      </CardContent>
    </Card>
  );
}
