/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T02:06:57Z
 * PURPOSE: REST client for external agent runner service powering Luigi executor.
 * SRP/DRY check: Pass - isolates REST contract and HTTP handling for agent runs.
 * shadcn/ui: Pass - backend utility only.
 */

export interface AgentRunRequest {
  agentId: string;
  input: Record<string, unknown>;
}

export interface AgentMessage {
  role: 'system' | 'orchestrator' | 'stage-lead' | 'agent' | 'tool' | 'user';
  agentId?: string;
  stageId?: string;
  content: string;
  reasoning?: string;
}

export interface AgentArtifact {
  stageId: string;
  type: 'markdown' | 'json' | 'table' | 'chart' | 'file-reference';
  title: string;
  description?: string;
  data?: unknown;
}

export interface AgentRunResponse {
  runId?: string;
  status: 'running' | 'completed' | 'failed';
  currentStageId?: string;
  stageSnapshots?: Record<string, unknown>;
  costCents?: number;
  messages?: AgentMessage[];
  artifacts?: AgentArtifact[];
  nextAction?: 'continue' | 'await_user';
  errorMessage?: string;
}

export interface AgentRunnerOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export async function callAgentByRest(
  payload: AgentRunRequest,
  options: AgentRunnerOptions
): Promise<AgentRunResponse> {
  const url = new URL('/agents/run', options.baseUrl);

  const controller = options.timeoutMs ? new AbortController() : undefined;
  const timeoutHandle = options.timeoutMs
    ? setTimeout(() => controller?.abort(), options.timeoutMs)
    : undefined;

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: Bearer  } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(Agent runner request failed:  );
    }

    const data = (await response.json()) as AgentRunResponse;
    return data;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
