/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T16:15:00Z
 * PURPOSE: Luigi Plan Type agent migrated to OpenAI Agents SDK to classify plan
 *          taxonomy and maturity, informing downstream lever exploration.
 * SRP/DRY check: Pass – addresses plan typing only and reuses shared Luigi SDK
 *                tool utilities for context.
 */

import { Agent } from '@openai/agents';
import { z } from 'zod';
import { luigiReadFilesTool } from '../../server/luigi/sdk-tools';

const PlanTypeAssessment = z.object({
  planType: z
    .string()
    .describe('Selected taxonomy label describing the mission plan (e.g., “Expansion Play”, “Stabilization”).'),
  maturityLevel: z
    .enum(['concept', 'prototype', 'pilot', 'scale'])
    .describe('Stage of readiness based on available assets and clarity.'),
  rationale: z
    .string()
    .describe('Narrative explaining why this plan type and maturity level were chosen.'),
  focusAreas: z
    .array(z.string())
    .default([])
    .describe('Priority dimensions requiring emphasis during lever exploration.'),
  downstreamImplications: z
    .array(z.string())
    .default([])
    .describe('Instructions or cautions for subsequent strategy tasks.'),
  openRisks: z
    .array(z.string())
    .default([])
    .describe('Risks tied specifically to the selected plan type.'),
});

export default new Agent({
  name: 'Luigi Plan Type Agent',
  instructions: `You execute PlanTypeTask in Luigi's Analysis & Gating stage.
- Review IdentifyPurpose outputs, gating diagnostics, and historical patterns.
- Classify the mission into a plan taxonomy and determine maturity level.
- Spell out focus areas and implications for potential levers and scenario work.
- Flag plan-specific risks that need mitigation before strategy deep dives.
- Complete every output field; write "None" for lists where no items apply.`,
  model: 'openai/gpt-5-mini',
  tools: [luigiReadFilesTool],
  outputType: PlanTypeAssessment,
  handoffDescription:
    'Categorises the mission plan type, maturity, and guidance feeding into lever exploration.',
});
