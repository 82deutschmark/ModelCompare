/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T16:20:00Z
 * PURPOSE: Analysis & Gating stage lead rewritten for OpenAI Agents SDK, wiring
 *          handoffs to child task agents and emitting structured status for the
 *          Luigi orchestrator.
 * SRP/DRY check: Pass – orchestrates only Analysis-stage responsibilities while
 *                reusing shared Luigi tool/handoff utilities.
 */

import { Agent } from '@openai/agents';
import { z } from 'zod';
import startTimeAgent from './starttime-agent';
import setupAgent from './setup-agent';
import redlineGateAgent from './redlinegate-agent';
import premiseAttackAgent from './premiseattack-agent';
import identifyPurposeAgent from './identifypurpose-agent';
import planTypeAgent from './plantype-agent';
import { createLuigiHandoff, luigiReadFilesTool } from '../../server/luigi/sdk-tools';

const AnalysisStageStatus = z.object({
  stageSummary: z
    .string()
    .describe('Narrative summary of Analysis & Gating status, grounded in child agent outputs.'),
  completedAgents: z
    .array(z.object({
      agentId: z.string(),
      keyFindings: z.array(z.string()).default([]),
    }))
    .default([])
    .describe('Child agents completed along with their key findings.'),
  outstandingRisks: z
    .array(z.string())
    .default([])
    .describe('Risks or blockers that remain unresolved at stage end.'),
  requiredInputs: z
    .array(z.string())
    .default([])
    .describe('Information or decisions needed from humans before progressing.'),
  recommendedNextSteps: z
    .array(z.string())
    .default([])
    .describe('Concrete follow-up actions for downstream stages or orchestrator.'),
});

const analysisStageLead = Agent.create({
  name: 'Analysis & Gating Stage Lead',
  instructions: `You coordinate the Analysis & Gating stage of the Luigi pipeline.
- Sequence StartTime, Setup, Redline Gate, Premise Attack, Identify Purpose, and Plan Type agents.
- Before handoffs, confirm prerequisites and clarify the expected deliverable.
- Consolidate child outputs into a succinct status update.
- Surface outstanding risks, human input requests, and recommended next steps.
- Always fill each structured output field; when no data applies, use "None" explicitly.`,
  model: 'openai/gpt-5-mini',
  tools: [luigiReadFilesTool],
  handoffs: [
    createLuigiHandoff('luigi_starttime', startTimeAgent, {
      description: 'Establishes mission baseline: start timestamp, run directory, critical anomalies.',
    }),
    createLuigiHandoff('luigi_setup', setupAgent, {
      description: 'Validates run directory and configuration prerequisites prior to diagnostics.',
    }),
    createLuigiHandoff('luigi_redlinegate', redlineGateAgent, {
      description: 'Runs gating diagnostics and reports pass/fail status with mitigations.',
    }),
    createLuigiHandoff('luigi_premiseattack', premiseAttackAgent, {
      description: 'Stress-tests mission assumptions, capturing weaknesses and recommended actions.',
    }),
    createLuigiHandoff('luigi_identifypurpose', identifyPurposeAgent, {
      description: 'Clarifies mission intent, success criteria, and scope boundaries.',
    }),
    createLuigiHandoff('luigi_plantype', planTypeAgent, {
      description: 'Categorises mission plan type, maturity, and guidance for strategy work.',
    }),
  ],
  outputType: AnalysisStageStatus,
  handoffDescription:
    'Coordinates Analysis & Gating tasks, summarising readiness risks and next steps for the Luigi orchestrator.',
  handoffOutputTypeWarningEnabled: false,
});

export default analysisStageLead;
