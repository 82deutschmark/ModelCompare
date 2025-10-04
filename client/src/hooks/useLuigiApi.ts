/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T10:34:01Z
 * PURPOSE: Luigi API hooks built on TanStack Query for run lifecycle, messages, artifacts, and controls.
 * SRP/DRY check: Pass - centralizes Luigi HTTP calls so components reuse consistent logic.
 * shadcn/ui: Pass - hooks only, no UI elements.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  CreateLuigiRunRequest,
  CreateLuigiRunResponse,
  LuigiRunResponse,
  ListLuigiMessagesResponse,
  LuigiUserReplyResponse,
  LuigiUserReplyRequest,
  ListLuigiArtifactsResponse,
} from "@shared/luigi-types";

const RUN_POLL_INTERVAL = 4000;

export function useCreateLuigiRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["luigi", "create"],
    mutationFn: async (payload: CreateLuigiRunRequest) => {
      const response = await apiRequest("POST", "/api/luigi/runs", payload);
      return (await response.json()) as CreateLuigiRunResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["luigi", "run", data.run.id] });
    },
  });
}

export function useLuigiRun(runId?: string, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ["luigi", "run", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/luigi/runs/${runId}`);
      return (await response.json()) as LuigiRunResponse;
    },
    refetchInterval: options?.poll ? RUN_POLL_INTERVAL : undefined,
  });
}

export function useLuigiMessages(runId?: string, limit = 200, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ["luigi", "messages", runId, limit],
    enabled: Boolean(runId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/luigi/runs/${runId}/messages?limit=${limit}`);
      return (await response.json()) as ListLuigiMessagesResponse;
    },
    refetchInterval: options?.poll ? RUN_POLL_INTERVAL : undefined,
  });
}

export function useLuigiArtifacts(runId?: string, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ["luigi", "artifacts", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/luigi/runs/${runId}/artifacts`);
      return (await response.json()) as ListLuigiArtifactsResponse;
    },
    refetchInterval: options?.poll ? RUN_POLL_INTERVAL : undefined,
  });
}

export function useSendLuigiReply(runId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["luigi", "reply", runId],
    mutationFn: async (payload: LuigiUserReplyRequest) => {
      if (!runId) throw new Error("Run ID is required");
      const response = await apiRequest("POST", `/api/luigi/runs/${runId}/replies`, payload);
      return (await response.json()) as LuigiUserReplyResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["luigi", "messages", runId] });
    },
  });
}

function buildMutation(method: "pause" | "resume" | "cancel") {
  return async (runId: string) => {
    const response = await apiRequest("POST", `/api/luigi/runs/${runId}/${method}`);
    return (await response.json()) as LuigiRunResponse;
  };
}

export function usePauseLuigiRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["luigi", "pause"],
    mutationFn: buildMutation("pause"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["luigi", "run", data.run.id] });
    },
  });
}

export function useResumeLuigiRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["luigi", "resume"],
    mutationFn: buildMutation("resume"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["luigi", "run", data.run.id] });
    },
  });
}

export function useCancelLuigiRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["luigi", "cancel"],
    mutationFn: buildMutation("cancel"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["luigi", "run", data.run.id] });
    },
  });
}
