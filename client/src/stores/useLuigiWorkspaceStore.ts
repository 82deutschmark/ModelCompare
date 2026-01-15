/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:07:30Z
 * PURPOSE: Zustand store managing ARC agent workspace form state and run context.
 * SRP/DRY check: Pass - isolates workspace state management for reuse across workspace components.
 */

import { create } from 'zustand';
import type {
  LuigiMessagePayload,
  LuigiArtifactRecord,
  LuigiRunSummary,
  LuigiStageId,
  LuigiStageState,
} from '@shared/luigi-types';

export interface LuigiFormState {
  taskId: string;
  analysisBrief: string;
  trainingPairs: string;
  evaluationInput: string;
  workspaceNotes: string;
}

export type LuigiStageSnapshot = LuigiStageState;

interface LuigiWorkspaceState {
  form: LuigiFormState;
  activeRunId?: string;
  runSummary?: LuigiRunSummary;
  stageMap: Record<LuigiStageId, LuigiStageSnapshot>;
  messages: LuigiMessagePayload[];
  artifacts: LuigiArtifactRecord[];
  isSubmitting: boolean;
  isPolling: boolean;
  error?: string;
  setFormField: <K extends keyof LuigiFormState>(key: K, value: LuigiFormState[K]) => void;
  resetForm: () => void;
  setSubmitting: (flag: boolean) => void;
  setPolling: (flag: boolean) => void;
  setError: (message?: string) => void;
  setActiveRunId: (runId?: string) => void;
  setRunContext: (run?: LuigiRunSummary, messages?: LuigiMessagePayload[], artifacts?: LuigiArtifactRecord[]) => void;
  appendMessage: (message: LuigiMessagePayload) => void;
  upsertArtifacts: (artifacts: LuigiArtifactRecord[]) => void;
}

const defaultForm: LuigiFormState = {
  taskId: '',
  analysisBrief: '',
  trainingPairs: '',
  evaluationInput: '',
  workspaceNotes: '',
};

export const useLuigiWorkspaceStore = create<LuigiWorkspaceState>((set) => ({
  form: defaultForm,
  activeRunId: undefined,
  runSummary: undefined,
  stageMap: {} as Record<LuigiStageId, LuigiStageSnapshot>,
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
      stageMap: run ? (run.stages as Record<LuigiStageId, LuigiStageSnapshot>) : state.stageMap,
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
      const map = new Map<string, LuigiArtifactRecord>();
      state.artifacts.forEach((artifact) => map.set(artifact.artifactId, artifact));
      incoming.forEach((artifact) => map.set(artifact.artifactId, artifact));
      return { artifacts: Array.from(map.values()) };
    }),
}));
