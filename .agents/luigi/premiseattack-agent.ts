/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T16:11:00Z
 * PURPOSE: Luigi Premise Attack agent ported to OpenAI Agents SDK to surface
 *          flawed assumptions and unresolved questions ahead of strategic
 *          planning work.
 * SRP/DRY check: Pass – concentrates on premise stress-testing and reuses
 *                shared Luigi tool utilities.
 */

import { Agent } from '@openai/agents';
import { z } from 'zod';
import { luigiReadFilesTool } from '../../server/luigi/sdk-tools';

const PremiseAttackSummary = z.object({
  challengedAssumptions: z
    .array(z.string())
    .min(1)
    .describe('Assumptions that proved weak or invalid during the attack.'),
  unresolvedQuestions: z
    .array(z.string())
    .default([])
    .describe('Investigative questions that must be answered before proceeding.'),
  riskRatings: z
    .array(
      z.object({
        item: z.string().describe('Assumption or premise component under scrutiny.'),
        severity: z.enum(['low', 'medium', 'high']).describe('Impact if the assumption remains unresolved.'),
        rationale: z.string().describe('Explanation supporting the severity selection.'),
      }),
    )
    .default([])
    .describe('Severity assessments for the most critical weaknesses.'),
  recommendedActions: z
    .array(z.string())
    .default([])
    .describe('Concrete follow-up actions for stage lead or orchestrator.'),
  evidenceLinks: z
    .array(z.string())
    .default([])
    .describe('File paths or references supporting the findings.'),
});

export default new Agent({
  name: 'Luigi Premise Attack Agent',
  instructions: `You run PremiseAttackTask in Luigi's Analysis & Gating stage.
- Challenge every assumption derived from the prompt and early diagnostics.
- Cite evidence when flagging weaknesses so downstream agents can verify.
- Produce action items for gaps that require clarification or stakeholder input.
- Coordinate with IdentifyPurposeTask by highlighting the most consequential open questions.
- Populate the structured output fully; mark items as "None" when deliberate gaps remain.`,
  model: 'openai/gpt-5-mini',
  tools: [luigiReadFilesTool],
  outputType: PremiseAttackSummary,
  handoffDescription:
    'Stress-tests mission assumptions, documenting weaknesses, open questions, and follow-up actions.',
});
