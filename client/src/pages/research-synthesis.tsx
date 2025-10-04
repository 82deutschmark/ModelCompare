/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T10:23:48Z
 * PURPOSE: Luigi business plan workspace page integrating form, timeline, conversation, and artifacts with live agents.
 * SRP/DRY check: Pass - composes existing Luigi components and hooks without duplicating logic.
 * shadcn/ui: Pass - uses existing shadcn/ui primitives throughout.
 */

import { useEffect, useMemo, useState } from "react";
import { AppNavigation } from "@/components/AppNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LuigiRunForm, type LuigiRunFormValues } from "@/components/luigi/LuigiRunForm";
import { LuigiStageTimeline } from "@/components/luigi/LuigiStageTimeline";
import { LuigiConversationLog } from "@/components/luigi/LuigiConversationLog";
import { LuigiArtifactPanel } from "@/components/luigi/LuigiArtifactPanel";
import { LuigiRunControls } from "@/components/luigi/LuigiRunControls";
import { useLuigiWorkspaceStore } from "@/stores/useLuigiWorkspaceStore";
import {
  useCreateLuigiRun,
  useLuigiRun,
  useLuigiMessages,
  useLuigiArtifacts,
  useSendLuigiReply,
  usePauseLuigiRun,
  useResumeLuigiRun,
  useCancelLuigiRun,
} from "@/hooks/useLuigiApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { LuigiRunSummary } from "@shared/luigi-types";
import { shallow } from "zustand/shallow";

export default function ResearchSynthesis() {
  const {
    activeRunId,
    runSummary,
    stageMap,
    messages,
    artifacts,
    isSubmitting,
    error,
    setSubmitting,
    setRunContext,
    setActiveRunId,
    setError,
  } = useLuigiWorkspaceStore((state) => ({
    activeRunId: state.activeRunId,
    runSummary: state.runSummary,
    stageMap: state.stageMap,
    messages: state.messages,
    artifacts: state.artifacts,
    isSubmitting: state.isSubmitting,
    error: state.error,
    setSubmitting: state.setSubmitting,
    setRunContext: state.setRunContext,
    setActiveRunId: state.setActiveRunId,
    setError: state.setError,
  }), shallow);

  const { toast } = useToast();
  const [replyDraft, setReplyDraft] = useState("");

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
      setError(runQuery.error instanceof Error ? runQuery.error.message : "Failed to load run");
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

  const handleCreateRun = async (values: LuigiRunFormValues) => {
    setSubmitting(true);
    try {
      const response = await createRun.mutateAsync(values);
      setActiveRunId(response.run.id);
      setRunContext(response.run, [], []);
      setError(undefined);
      toast({ title: "Luigi pipeline launched", description: "Agents are preparing the business plan." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to launch Luigi pipeline";
      setError(message);
      toast({ title: "Launch failed", description: message, variant: "destructive" });
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
    toast({ title: "Run cancelled", description: "Luigi run marked as cancelled." });
  };

  const handleReply = async () => {
    if (!activeRunId || !replyDraft.trim()) return;
    try {
      await sendReply.mutateAsync({ runId: activeRunId, content: replyDraft.trim() });
      setReplyDraft("");
      toast({ title: "Reply sent", description: "Luigi orchestrator notified." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reply";
      toast({ title: "Reply failed", description: message, variant: "destructive" });
    }
  };

  const isMutating = pauseRun.isPending || resumeRun.isPending || cancelRun.isPending;

  const stageMapWithFallback = useMemo(
    () => (Object.keys(stageMap ?? {}).length > 0 ? stageMap : runSummary?.stages ?? ({} as LuigiRunSummary['stages'])),
    [stageMap, runSummary]
  );

  return (
    <div className="min-h-screen bg-muted/10">
      <AppNavigation
        title="Luigi Business Plan Workspace"
        subtitle="Coordinate the Luigi agent federation to assemble a full execution plan"
      />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Workflow Issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6">
            <LuigiRunForm isSubmitting={isSubmitting || createRun.isPending} onSubmit={handleCreateRun} />
            <LuigiRunControls
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
            <LuigiStageTimeline stageMap={stageMapWithFallback} currentStageId={runSummary?.currentStageId ?? null} />
            <StatusCard
              run={runSummary}
              isLoading={runQuery.isLoading}
              messageCount={messages.length}
              artifactCount={artifacts.length}
            />
          </div>
          <div className="space-y-6">
            <LuigiConversationLog messages={messages} />
            <LuigiArtifactPanel artifacts={artifacts} />
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
        <CardTitle>User Reply</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Provide additional guidance or clarifications for the Luigi orchestrator."
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
          {run ? `Updated ${new Date(run.updatedAt).toLocaleString()}` : 'Launch a run to begin tracking.'}
        </div>
      </CardContent>
    </Card>
  );
}

