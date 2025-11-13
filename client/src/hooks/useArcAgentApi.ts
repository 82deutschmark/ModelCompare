/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: React Query hooks for interacting with the ARC agent REST API including
 *          run lifecycle, polling, message transcripts, and artifact retrieval.
 * SRP/DRY check: Pass - encapsulates API calls so UI components remain declarative.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type {
  CreateArcRunRequest,
  CreateArcRunResponse,
  ArcRunResponse,
  ListArcMessagesResponse,
  ArcUserReplyRequest,
  ArcUserReplyResponse,
  ListArcArtifactsResponse,
} from '@shared/arc-types';

const RUN_POLL_INTERVAL = 4000;

export function useCreateArcRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['arc-agent', 'create'],
    mutationFn: async (payload: CreateArcRunRequest) => {
      const response = await apiRequest('POST', '/api/arc-agent/runs', payload);
      return (await response.json()) as CreateArcRunResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['arc-agent', 'run', data.run.id] });
    },
  });
}

export function useArcRun(runId?: string, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['arc-agent', 'run', runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/arc-agent/runs/${runId}`);
      return (await response.json()) as ArcRunResponse;
    },
    refetchInterval: options?.poll ? RUN_POLL_INTERVAL : undefined,
  });
}

export function useArcMessages(runId?: string, limit = 200, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['arc-agent', 'messages', runId, limit],
    enabled: Boolean(runId),
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/arc-agent/runs/${runId}/messages?limit=${limit}`);
      return (await response.json()) as ListArcMessagesResponse;
    },
    refetchInterval: options?.poll ? RUN_POLL_INTERVAL : undefined,
  });
}

export function useArcArtifacts(runId?: string, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['arc-agent', 'artifacts', runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/arc-agent/runs/${runId}/artifacts`);
      return (await response.json()) as ListArcArtifactsResponse;
    },
    refetchInterval: options?.poll ? RUN_POLL_INTERVAL : undefined,
  });
}

export function useSendArcReply(runId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['arc-agent', 'reply', runId],
    mutationFn: async (payload: ArcUserReplyRequest) => {
      if (!runId) throw new Error('Run ID is required');
      const response = await apiRequest('POST', `/api/arc-agent/runs/${runId}/replies`, payload);
      return (await response.json()) as ArcUserReplyResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arc-agent', 'messages', runId] });
    },
  });
}

export function useCancelArcRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['arc-agent', 'cancel'],
    mutationFn: async (runId: string) => {
      const response = await apiRequest('POST', `/api/arc-agent/runs/${runId}/cancel`);
      return (await response.json()) as ArcRunResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['arc-agent', 'run', data.run.id] });
    },
  });
}
