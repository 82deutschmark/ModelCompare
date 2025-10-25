/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T16:05:00Z
 * PURPOSE: Luigi Start Time agent implemented via OpenAI Agents SDK, producing
 *          structured readiness metadata for the Analysis & Gating stage lead.
 * SRP/DRY check: Pass – encapsulates only Start Time responsibilities and
 *                reuses shared Luigi tool utilities.
 */

import { Agent } from '@openai/agents';
import { z } from 'zod';
import { luigiReadFilesTool } from '../../server/luigi/sdk-tools';

const StartTimeSummary = z.object({
  startedAtIso: z
    .string()
    .describe('ISO 8601 timestamp confirming when the Luigi mission began.'),
  runDirectory: z
    .string()
    .describe('Filesystem directory or identifier prepared for downstream tasks.'),
  highlights: z
    .array(z.string())
    .min(1)
    .describe('Key observations to brief the Analysis stage lead.'),
  blockers: z
    .array(z.string())
    .default([])
    .describe('Outstanding issues preventing smooth progression.'),
  anomalies: z
    .array(z.string())
    .default([])
    .describe('Unexpected findings requiring follow-up (environment mismatches, config gaps, etc.).'),
});

export default new Agent({
  name: 'Luigi Start Time Agent',
  instructions: `You own the StartTimeTask in Luigi's Analysis & Gating stage.
- Capture the precise mission start timestamp and confirm the working directory.
- Inspect run configuration and environment banners for inconsistencies.
- Summarise anything downstream owners must know before SetupTask begins.
- Populate the structured output fields faithfully; provide "N/A" if data does not exist instead of omitting fields.`,
  model: 'openai/gpt-5-mini',
  tools: [luigiReadFilesTool],
  outputType: StartTimeSummary,
  handoffDescription:
    'Establishes the Luigi mission baseline (start timestamp, run directory, critical anomalies).',
});
