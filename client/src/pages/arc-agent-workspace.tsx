/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:08:00Z
 * PURPOSE: ARC agent workspace page orchestrating ARC puzzle runs with OpenAI Agents-powered pipeline.
 * SRP/DRY check: Pass - coordinates ARC workspace components and hooks without duplicating logic.
 */

import { useEffect, useMemo, useState } from 'react';
import { AppNavigation } from '@/components/AppNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArcAgentRunForm } from '@/components/agent/ArcAgentRunForm';
import { ArcStageTimeline } from '@/components/agent/ArcStageTimeline';
import { ArcConversationLog } from '@/components/agent/ArcConversationLog';
import { ArcArtifactPanel } from '@/components/agent/ArcArtifactPanel';
import { ArcRunControls } from '@/components/agent/ArcRunControls';
import { useLuigiWorkspaceStore } from '@/stores/useLuigiWorkspaceStore';
import {
  useCreateLuigiRun,
  useLuigiRun,
  useLuigiMessages,
  useLuigiArtifacts,
  useSendLuigiReply,
  usePauseLuigiRun,
  useResumeLuigiRun,
  useCancelLuigiRun,
} from '@/hooks/useLuigiApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { LuigiRunSummary } from '@shared/luigi-types';
import type { CreateLuigiRunRequest } from '@shared/luigi-types';

export default function ArcAgentWorkspace() {
  const activeRunId = useLuigiWorkspaceStore((state) => state.activeRunId);
  const runSummary = useLuigiWorkspaceStore((state) => state.runSummary);
  const stageMap = useLuigiWorkspaceStore((state) => state.stageMap);
  const messages = useLuigiWorkspaceStore((state) => state.messages);
  const artifacts = useLuigiWorkspaceStore((state) => state.artifacts);
  const isSubmitting = useLuigiWorkspaceStore((state) => state.isSubmitting);
  const error = useLuigiWorkspaceStore((state) => state.error);
  const setSubmitting = useLuigiWorkspaceStore((state) => state.setSubmitting);
  const setRunContext = useLuigiWorkspaceStore((state) => state.setRunContext);
  const setActiveRunId = useLuigiWorkspaceStore((state) => state.setActiveRunId);
  const setError = useLuigiWorkspaceStore((state) => state.setError);

  const { toast } = useToast();
  const [replyDraft, setReplyDraft] = useState('');

  const createRun = useCreateLuigiRun();
  const pauseRun = usePauseLuigiRun();
  const resumeRun = useResumeLuigiRun();
  const cancelRun = useCancelLuigiRun();
  const sendReply = useSendLuigiReply(activeRunId);

  const runQuery = useLuigiRun(activeRunId, { poll: true });
  const messagesQuery = useLuigiMessages(activeRunId, 200, { poll: true });
  const artifactsQuery = useLuigiArtifacts(activeRunId, { poll: true });

  useEffect(() => {
    if (runQuery.data?.run) {
      setRunContext(runQuery.data.run);
    }
    if (runQuery.error) {
      setError(runQuery.error instanceof Error ? runQuery.error.message : 'Failed to load run');
    }
  }, [runQuery.data, runQuery.error, setRunContext, setError]);

  useEffect(() => {
    if (messagesQuery.data?.messages) {
      setRunContext(undefined, messagesQuery.data.messages, undefined);
    }
  }, [messagesQuery.data, setRunContext]);

  useEffect(() => {
    if (artifactsQuery.data?.artifacts) {
      setRunContext(undefined, undefined, artifactsQuery.data.artifacts);
    }
  }, [artifactsQuery.data, setRunContext]);

  const handleCreateRun = async (payload: CreateLuigiRunRequest) => {
    setSubmitting(true);
    try {
      const response = await createRun.mutateAsync(payload);
      setActiveRunId(response.run.id);
      setRunContext(response.run, [], []);
      setError(undefined);
      toast({
        title: 'ARC agent launched',
        description: 'The ARC orchestrator is analysing training grids.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to launch ARC agent';
      setError(message);
      toast({ title: 'Launch failed', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!activeRunId) return;
    const response = await pauseRun.mutateAsync(activeRunId);
    setRunContext(response.run);
  };

  const handleResume = async () => {
    if (!activeRunId) return;
    const response = await resumeRun.mutateAsync(activeRunId);
    setRunContext(response.run);
  };

  const handleCancel = async () => {
    if (!activeRunId) return;
    const response = await cancelRun.mutateAsync(activeRunId);
    setRunContext(response.run);
    toast({ title: 'Run cancelled', description: 'ARC agent run cancelled.' });
  };

  const handleReply = async () => {
    if (!activeRunId || !replyDraft.trim()) return;
    try {
      await sendReply.mutateAsync({ runId: activeRunId, content: replyDraft.trim() });
      setReplyDraft('');
      toast({ title: 'Reply sent', description: 'Feedback shared with the ARC orchestrator.' });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send reply';
      toast({ title: 'Reply failed', description: message, variant: 'destructive' });
    }
  };

  const isMutating = pauseRun.isPending || resumeRun.isPending || cancelRun.isPending;

  const stageMapWithFallback = useMemo(
    () => (Object.keys(stageMap ?? {}).length > 0 ? stageMap : runSummary?.stages ?? ({} as LuigiRunSummary['stages'])),
    [stageMap, runSummary]
  );

  return (
    <div className="min-h-screen bg-muted/10">
      <AppNavigation title="ARC Agent Workspace" subtitle="Coordinate an ARC-solving agent federation" />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Workspace Issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6">
            <ArcAgentRunForm isSubmitting={isSubmitting || createRun.isPending} onSubmit={handleCreateRun} />
            <ArcRunControls
              run={runSummary}
              isMutating={isMutating}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onRefresh={() => runQuery.refetch()}
            />
            <CardReply
              disabled={!activeRunId || sendReply.isPending}
              value={replyDraft}
              onChange={setReplyDraft}
              onSubmit={handleReply}
            />
          </div>
          <div className="space-y-6">
            <ArcStageTimeline stageMap={stageMapWithFallback} currentStageId={runSummary?.currentStageId ?? null} />
            <StatusCard
              run={runSummary}
              isLoading={runQuery.isLoading}
              messageCount={messages.length}
              artifactCount={artifacts.length}
            />
          </div>
          <div className="space-y-6">
            <ArcConversationLog messages={messages} />
            <ArcArtifactPanel artifacts={artifacts} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface CardReplyProps {
  disabled: boolean;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
}

function CardReply({ disabled, value, onChange, onSubmit }: CardReplyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Suggest new hypotheses or highlight overlooked grid relationships for the ARC agent."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={3}
        />
        <Button onClick={onSubmit} disabled={disabled || value.trim().length === 0}>
          {disabled && value.trim().length > 0 ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </span>
          ) : (
            'Send Reply'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface StatusCardProps {
  run?: LuigiRunSummary;
  isLoading: boolean;
  messageCount: number;
  artifactCount: number;
}

function StatusCard({ run, isLoading, messageCount, artifactCount }: StatusCardProps) {
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
          {run ? `Updated ${new Date(run.updatedAt).toLocaleString()}` : 'Launch a run to start tracking.'}
        </div>
      </CardContent>
    </Card>
  );
}
