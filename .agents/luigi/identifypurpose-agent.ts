/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T16:13:00Z
 * PURPOSE: Luigi Identify Purpose agent refactored to OpenAI Agents SDK to
 *          synthesize mission intent, outcomes, and boundaries for downstream
 *          strategic planning tasks.
 * SRP/DRY check: Pass – isolates purpose clarification while reusing shared
 *                Luigi tooling for context retrieval.
 */

import { Agent } from '@openai/agents';
import { z } from 'zod';
import { luigiReadFilesTool } from '../../server/luigi/sdk-tools';

const IdentifyPurposeSummary = z.object({
  missionPurpose: z
    .string()
    .describe('Concise description of the mission’s overarching objective.'),
  successCriteria: z
    .array(z.string())
    .min(1)
    .describe('Measurable outcomes or signals indicating mission success.'),
  scopeBoundaries: z
    .array(z.string())
    .default([])
    .describe('Explicit inclusions/exclusions framing the mission scope.'),
  stakeholderSignals: z
    .array(z.string())
    .default([])
    .describe('Key stakeholder directives, constraints, or sensitivities.'),
  unresolvedGaps: z
    .array(z.string())
    .default([])
    .describe('Open questions the stage lead or orchestrator must resolve.'),
});

export default new Agent({
  name: 'Luigi Identify Purpose Agent',
  instructions: `You execute IdentifyPurposeTask within Luigi's Analysis & Gating stage.
- Integrate validated prompt details, stakeholder constraints, and premise attack findings.
- Describe the mission's purpose crisply, emphasising why it matters.
- Capture measurable success criteria and clearly marked scope boundaries.
- Highlight unresolved gaps needing orchestrator or stakeholder attention.
- Populate all structured fields; write "None" for lists that intentionally remain empty.`,
  model: 'openai/gpt-5-mini',
  tools: [luigiReadFilesTool],
  outputType: IdentifyPurposeSummary,
  handoffDescription:
    'Clarifies mission intent, success criteria, and scope boundaries for downstream strategy work.',
});
