/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T16:07:00Z
 * PURPOSE: Luigi Setup agent implemented with OpenAI Agents SDK to validate
 *          filesystem scaffolding and configuration prerequisites for the
 *          Analysis & Gating stage.
 * SRP/DRY check: Pass – focuses solely on setup validation while reusing
 *                shared Luigi tool builders.
 */

import { Agent } from '@openai/agents';
import { z } from 'zod';
import { luigiReadFilesTool } from '../../server/luigi/sdk-tools';

const SetupValidationSummary = z.object({
  runDirectoryVerified: z
    .boolean()
    .describe('True when the target run directory exists and is writable.'),
  createdPaths: z
    .array(z.string())
    .default([])
    .describe('Directories or files created during setup.'),
  missingPaths: z
    .array(z.string())
    .default([])
    .describe('Required paths still absent after setup actions.'),
  configFindings: z
    .array(z.string())
    .default([])
    .describe('Key configuration notes, overrides, or warnings surfaced.'),
  blockers: z
    .array(z.string())
    .default([])
    .describe('Outstanding blockers that must be resolved before Redline Gate.'),
  nextActions: z
    .array(z.string())
    .default([])
    .describe('Targeted follow-up actions for downstream agents or humans.'),
});

export default new Agent({
  name: 'Luigi Setup Agent',
  instructions: `You execute SetupTask in Luigi's Analysis & Gating stage.
- Confirm the run directory exists, is writable, and contains expected scaffolding.
- Inspect configuration manifests and note any overrides required for this mission.
- Record any blockers preventing the Redline Gate from commencing.
- Provide precise follow-up actions linked to owners when possible.
- Populate every output field; use "None" or "N/A" if no data applies instead of dropping fields.`,
  model: 'openai/gpt-5-mini',
  tools: [luigiReadFilesTool],
  outputType: SetupValidationSummary,
  handoffDescription:
    'Validates run directory and configuration readiness prior to Redline Gate diagnostics.',
});
