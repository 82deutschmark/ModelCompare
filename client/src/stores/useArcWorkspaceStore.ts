/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Zustand store managing ARC agent workspace state including active run context,
 *          conversation transcripts, artifacts, and submission flags.
 * SRP/DRY check: Pass - centralizes ARC workspace state so UI components remain stateless.
 */

import { create } from 'zustand';
import type {
  ArcArtifactRecord,
  ArcMessagePayload,
  ArcRunSummary,
  ArcStageId,
  ArcStageState,
} from '@shared/arc-types';

export interface ArcFormState {
  taskId: string;
  challengeName: string;
  puzzleDescription: string;
  puzzlePayload: string;
  targetPatternSummary?: string;
  evaluationFocus?: string;
}

const defaultForm: ArcFormState = {
  taskId: '',
  challengeName: '',
  puzzleDescription: '',
  puzzlePayload: '',
  targetPatternSummary: '',
  evaluationFocus: '',
};

interface ArcWorkspaceState {
  form: ArcFormState;
  activeRunId?: string;
  runSummary?: ArcRunSummary;
  stageMap: Record<ArcStageId, ArcStageState>;
  messages: ArcMessagePayload[];
  artifacts: ArcArtifactRecord[];
  isSubmitting: boolean;
  isPolling: boolean;
  error?: string;
  setFormField: <K extends keyof ArcFormState>(key: K, value: ArcFormState[K]) => void;
  resetForm: () => void;
  setSubmitting: (flag: boolean) => void;
  setPolling: (flag: boolean) => void;
  setError: (message?: string) => void;
  setActiveRunId: (runId?: string) => void;
  setRunContext: (run?: ArcRunSummary, messages?: ArcMessagePayload[], artifacts?: ArcArtifactRecord[]) => void;
  appendMessage: (message: ArcMessagePayload) => void;
  upsertArtifacts: (artifacts: ArcArtifactRecord[]) => void;
}

export const useArcWorkspaceStore = create<ArcWorkspaceState>((set) => ({
  form: { ...defaultForm },
  activeRunId: undefined,
  runSummary: undefined,
  stageMap: {} as Record<ArcStageId, ArcStageState>,
  messages: [],
  artifacts: [],
  isSubmitting: false,
  isPolling: false,
  error: undefined,
  setFormField: (key, value) =>
    set((state) => ({
      form: {
        ...state.form,
        [key]: value,
      },
    })),
  resetForm: () => set({ form: { ...defaultForm } }),
  setSubmitting: (flag) => set({ isSubmitting: flag }),
  setPolling: (flag) => set({ isPolling: flag }),
  setError: (message) => set({ error: message }),
  setActiveRunId: (runId) => set({ activeRunId: runId }),
  setRunContext: (run, messages, artifacts) =>
    set((state) => ({
      runSummary: run ?? state.runSummary,
      stageMap: run ? (run.stages as Record<ArcStageId, ArcStageState>) : state.stageMap,
      messages: messages ?? state.messages,
      artifacts: artifacts ?? state.artifacts,
      activeRunId: run?.id ?? state.activeRunId,
    })),
  appendMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  upsertArtifacts: (incoming) =>
    set((state) => {
      const map = new Map<string, ArcArtifactRecord>();
      state.artifacts.forEach((artifact) => map.set(artifact.id, artifact));
      incoming.forEach((artifact) => map.set(artifact.id, artifact));
      return { artifacts: Array.from(map.values()) };
    }),
}));
