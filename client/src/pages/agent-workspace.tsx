/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: ARC agent workspace page orchestrating run form, controls, timeline,
 *          conversation log, and artifact viewer using the new ARC agent modules.
 * SRP/DRY check: Pass - page composes modular components and hooks without duplicating logic.
 */

import { useEffect, useMemo, useState } from 'react';
import { AppNavigation } from '@/components/AppNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ArcRunForm, type ArcRunFormValues } from '@/components/arc/ArcRunForm';
import { ArcStageTimeline } from '@/components/arc/ArcStageTimeline';
import { ArcConversationLog } from '@/components/arc/ArcConversationLog';
import { ArcArtifactPanel } from '@/components/arc/ArcArtifactPanel';
import { ArcRunControls } from '@/components/arc/ArcRunControls';
import { ArcStatusCard } from '@/components/arc/ArcStatusCard';
import { useArcWorkspaceStore } from '@/stores/useArcWorkspaceStore';
import type { ArcRunSummary } from '@shared/arc-types';
import {
  useCreateArcRun,
  useArcRun,
  useArcMessages,
  useArcArtifacts,
  useSendArcReply,
  useCancelArcRun,
} from '@/hooks/useArcAgentApi';

export default function AgentWorkspacePage() {
  const activeRunId = useArcWorkspaceStore((state) => state.activeRunId);
  const runSummary = useArcWorkspaceStore((state) => state.runSummary);
  const stageMap = useArcWorkspaceStore((state) => state.stageMap);
  const messages = useArcWorkspaceStore((state) => state.messages);
  const artifacts = useArcWorkspaceStore((state) => state.artifacts);
  const isSubmitting = useArcWorkspaceStore((state) => state.isSubmitting);
  const error = useArcWorkspaceStore((state) => state.error);
  const setSubmitting = useArcWorkspaceStore((state) => state.setSubmitting);
  const setRunContext = useArcWorkspaceStore((state) => state.setRunContext);
  const setActiveRunId = useArcWorkspaceStore((state) => state.setActiveRunId);
  const setError = useArcWorkspaceStore((state) => state.setError);

  const { toast } = useToast();
  const [replyDraft, setReplyDraft] = useState('');

  const createRun = useCreateArcRun();
  const cancelRun = useCancelArcRun();
  const sendReply = useSendArcReply(activeRunId);

  const runQuery = useArcRun(activeRunId, { poll: true });
  const messagesQuery = useArcMessages(activeRunId, 200, { poll: true });
  const artifactsQuery = useArcArtifacts(activeRunId, { poll: true });

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

  const handleCreateRun = async (values: ArcRunFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        taskId: values.taskId,
        challengeName: values.challengeName,
        puzzleDescription: values.puzzleDescription,
        puzzlePayload: JSON.parse(values.puzzlePayload),
        targetPatternSummary: values.targetPatternSummary || undefined,
        evaluationFocus: values.evaluationFocus || undefined,
      };
      const response = await createRun.mutateAsync(payload);
      setActiveRunId(response.run.id);
      setRunContext(response.run, [], []);
      setError(undefined);
      toast({ title: 'ARC agent launched', description: 'ARC workspace has started processing the puzzle.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to launch ARC agent';
      setError(message);
      toast({ title: 'Launch failed', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeRunId) return;
    try {
      const response = await cancelRun.mutateAsync(activeRunId);
      setRunContext(response.run);
      toast({ title: 'Run cancelled', description: 'ARC agent run marked as cancelled.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel run';
      toast({ title: 'Cancel failed', description: message, variant: 'destructive' });
    }
  };

  const handleReply = async () => {
    if (!activeRunId || !replyDraft.trim()) return;
    try {
      await sendReply.mutateAsync({ runId: activeRunId, content: replyDraft.trim() });
      setReplyDraft('');
      toast({ title: 'Reply sent', description: 'ARC agent received your input.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reply';
      toast({ title: 'Reply failed', description: message, variant: 'destructive' });
    }
  };

  const stageMapWithFallback = useMemo(
    () => (Object.keys(stageMap ?? {}).length > 0 ? stageMap : runSummary?.stages ?? ({} as ArcRunSummary['stages'])),
    [stageMap, runSummary]
  );

  return (
    <div className="min-h-screen bg-muted/10">
      <AppNavigation
        title="ARC Agent Workspace"
        subtitle="Experiment with ARC puzzle solving using the OpenAI Agents SDK"
      />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Workspace Issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6">
            <ArcRunForm isSubmitting={isSubmitting || createRun.isPending} onSubmit={handleCreateRun} />
            <ArcRunControls
              run={runSummary}
              isCancelling={cancelRun.isPending}
              onCancel={handleCancel}
              onRefresh={() => runQuery.refetch()}
            />
            <ReplyCard
              disabled={!activeRunId || sendReply.isPending}
              value={replyDraft}
              onChange={setReplyDraft}
              onSubmit={handleReply}
            />
          </div>
          <div className="space-y-6">
            <ArcStageTimeline stageMap={stageMapWithFallback} currentStageId={runSummary?.currentStageId ?? null} />
            <ArcStatusCard
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

interface ReplyCardProps {
  disabled: boolean;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
}

function ReplyCard({ disabled, value, onChange, onSubmit }: ReplyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Guidance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Provide hints, corrections, or additional constraints for the ARC agent."
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
