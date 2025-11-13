/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T16:09:00Z
 * PURPOSE: Luigi Redline Gate agent ported to OpenAI Agents SDK for early risk
 *          detection, ensuring gating diagnostics output structured status
 *          metadata for downstream tasks.
 * SRP/DRY check: Pass – focuses on redline gating while leveraging shared Luigi
 *                tool utilities for filesystem access.
 */

import { Agent } from '@openai/agents';
import { z } from 'zod';
import { luigiReadFilesTool } from '../../server/luigi/sdk-tools';

const RedlineGateReport = z.object({
  status: z
    .enum(['pass', 'fail', 'manual-review'])
    .describe('Overall gating verdict: pass, fail, or requires manual review.'),
  criticalFindings: z
    .array(z.string())
    .default([])
    .describe('Critical issues uncovered that threaten mission viability.'),
  mitigations: z
    .array(z.string())
    .default([])
    .describe('Recommended mitigations or actions to clear the gate.'),
  metrics: z
    .record(z.string(), z.string())
    .default({})
    .describe('Key gating metrics (e.g., diagnostics run time, checklist coverage).'),
  blockers: z
    .array(z.string())
    .default([])
    .describe('Blocking items that must be resolved before proceeding.'),
  escalationNotes: z
    .array(z.string())
    .default([])
    .describe('Notes to escalate to orchestrator or Premise Attack if red flags persist.'),
});

export default new Agent({
  name: 'Luigi Redline Gate Agent',
  instructions: `You execute RedlineGateTask in Luigi's Analysis & Gating stage.
- Run every gating diagnostic and capture evidence for the verdict.
- Document critical findings and quantify risk where possible.
- Provide mitigations or escalation paths for any blocker.
- Ensure metrics and logs are referenced using the read_files tool when needed.
- Fill each output section; use "None" where a list would otherwise be empty.`,
  model: 'openai/gpt-5-mini',
  tools: [luigiReadFilesTool],
  outputType: RedlineGateReport,
  handoffDescription:
    'Runs gating diagnostics and reports pass/fail status with mitigation notes for downstream agents.',
});
