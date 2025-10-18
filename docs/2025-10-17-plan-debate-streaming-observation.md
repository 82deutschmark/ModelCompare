# 2025-10-17-Debate-Streaming-Observation-Plan

* Author: GPT-5 Codex
* Date: 2025-10-17 and the 19:52 UTC
* PURPOSE: Document the investigation path to reproduce and trace the debate streaming pipeline when launching a GPT-5 mini versus GPT-5 nano session, ensuring we validate the hooks, services, server routes, and provider orchestration that must fire to hit the external APIs.
* SRP/DRY check: Pass - Focused planning document for the current debate streaming observation; confirmed no overlapping 2025-10-17 plan for this goal exists.

## Goal
Confirm the debate streaming flow actually triggers GPT-5 mini and GPT-5 nano provider calls and explain why streaming appears stalled.

## Key Questions
- Which client surface kicks off the stream request and with what payload?
- How does the server debate route resolve providers and enqueue streaming jobs?
- Are GPT-5 mini/nano models filtered out by capability or quota guards?
- What do server diagnostics show when we hit the endpoint locally?

## Investigation Checklist
- [x] Review the client debate initiation flow (`DebateControls`, `debateService`, `useDebateStreaming`).
- [x] Trace the server debate streaming route (`debate.routes.ts`, `routes.ts`) and its SSE lifecycle.
- [x] Inspect model capability lookups for GPT-5 mini/nano in `model.service` and provider registry.
- [x] Exercise the debate streaming endpoint locally with real models and capture server logs.
- [x] Verify the client receives streaming chunks or diagnose failure response handling.
- [ ] Summarize findings with recommended remediation steps.

## Deliverables
- Reproduction steps with observed behavior.
- Root cause analysis or prioritized hypotheses with code references.
- Recommended fixes or configuration changes ready for implementation.
