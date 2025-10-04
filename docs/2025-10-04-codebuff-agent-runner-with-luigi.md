/*
 * Author: Buffy the Base Agent
 * Date: 2025-10-04T00:00:00Z
 * PURPOSE: How to enable and operate Luigi using the external Codebuff Agent Runner (REST) or SDK, including env variables, endpoints, and verification steps.
 * SRP/DRY check: Pass - Documentation only; references existing modules without duplication.
 * shadcn/ui: Pass - N/A for docs (UI guidance referenced but no custom UI implemented).
 */

# Using Codebuff Agent Runner with Luigi

This guide explains how to run your Luigi pipeline using the Codebuff Agent Runner (external process) with your existing .agents definitions. Your backend is already wired to call the runner—just point it to a running instance and set env vars.

Related references:
- docs/Luigi-Architecture-Analysis.md (context and diagrams)
- server/services/agent-runner.ts (REST client)
- server/luigi/executor.ts (orchestration)
- server/config.ts (env → config)
- server/routes/luigi.ts (API wiring)
- .agents/luigi_master_orchestrator.ts (agent id = "luigi-master-orchestrator")

---

## 1) Environment Variables

Set these in your .env (you mentioned they’re already added):

```
AGENT_RUNNER_BASE_URL=http://localhost:8700
AGENT_RUNNER_API_KEY=cb_your_api_key
LUIGI_ORCHESTRATOR_ID=luigi-master-orchestrator
```

Notes:
- LUIGI_ORCHESTRATOR_ID defaults to "luigi-master-orchestrator"; override only if you changed the agent id.
- The backend reads these via getLuigiConfig() in server/config.ts.

---

## 2) Start a Runner

You have two options:

A) Local runner (recommended for development)
- Start the Codebuff Agent Runner on port 8700
- Ensure it can load your local ./.agents directory
- Keep it running while you use the UI

B) Hosted runner (if you have access)
- Set AGENT_RUNNER_BASE_URL to the hosted endpoint
- Use AGENT_RUNNER_API_KEY
- Make sure your agents are available to the hosted runner (publish/upload per their workflow)

---

## 3) HTTP Contract (What your backend sends/expects)

Endpoint (from server/services/agent-runner.ts):
- POST {AGENT_RUNNER_BASE_URL}/agents/run
- Headers: Content-Type: application/json; Authorization: Bearer {AGENT_RUNNER_API_KEY}

Request body:
```
{
  "agentId": "luigi-master-orchestrator",
  "input": {
    "runId": "uuid",
    "missionName": "...",
    "objective": "...",
    "constraints": "...?",
    "successCriteria": "...?",
    "stakeholderNotes": "...?"
  }
}
```

Response shape expected by LuigiExecutor.handleAgentResponse:
```
{
  "status": "running" | "completed" | "failed",
  "currentStageId": "optional",
  "stageSnapshots": { "...": { status, startedAt?, completedAt? } },
  "costCents": 123,
  "messages": [
    { "role": "system|orchestrator|stage-lead|agent|tool|user", "agentId?": "...", "stageId?": "...", "content": "...", "reasoning?": "..." }
  ],
  "artifacts": [
    { "stageId": "...", "type": "markdown|json|table|chart|file-reference", "title": "...", "description?": "...", "data?": { ... } }
  ],
  "nextAction": "continue" | "await_user"
}
```

---

## 4) How it flows (end-to-end)

1) UI (Research Synthesis page) → POST /api/luigi/runs
2) server/routes/luigi.ts → LuigiExecutor.createRun() → startRun()
3) LuigiExecutor.launchOrchestrator() → callAgentByRest() to {BASE_URL}/agents/run
4) Runner executes your .agents pipeline and returns progress/messages/artifacts
5) LuigiExecutor persists status/messages/artifacts to storage
6) UI polls run status and displays progress

---

## 5) Verify it’s working

- Start your backend as usual (npm run dev or npm run start)
- Ensure your runner is running/accessible at AGENT_RUNNER_BASE_URL
- In the UI, create a run from the Research Synthesis page
- You should see:
  - Initial system message: "Luigi orchestrator launching..."
  - Status transitions from pending → running → completed (or await_user)
  - Messages and artifacts appear as the runner progresses

If you prefer curl for quick checks:
```
# Create a run via API
curl -X POST http://localhost:5000/api/luigi/runs \
  -H "Content-Type: application/json" \
  -d '{
    "missionName": "Test Run",
    "objective": "Verify Codebuff runner connectivity"
  }'

# Fetch run status
curl http://localhost:5000/api/luigi/runs/{runId}

# Fetch messages
curl http://localhost:5000/api/luigi/runs/{runId}/messages
```

---

## 6) Troubleshooting

- Connection refused to 8700
  - Runner not running, wrong port, or wrong AGENT_RUNNER_BASE_URL

- 401 Unauthorized
  - Missing/invalid AGENT_RUNNER_API_KEY or Authorization header not accepted by the runner

- No stageSnapshots/messages/artifacts
  - Runner may not be emitting these fields; update runner configuration or extend LuigiExecutor.handleAgentResponse mapping as needed

- Long runs time out
  - Increase LuigiExecutor timeoutMs (constructor option) if your runner takes longer than 10 minutes

- Orchestrator id mismatch
  - Ensure LUIGI_ORCHESTRATOR_ID matches .agents/luigi_master_orchestrator.ts id (default is already correct)

---

## 7) Using the SDK (optional)

If you prefer an embedded client over REST, you can replace callAgentByRest with the Codebuff SDK client:

Pseudo-code:
```
// import CodebuffClient from 'codebuff'
// const client = new CodebuffClient({ apiKey: process.env.AGENT_RUNNER_API_KEY })
// const response = await client.runAgent({ agentId, input })
// await this.handleAgentResponse(runId, response)
```

The existing REST approach is already implemented and typically simpler to operate—no code changes required as long as the runner is reachable.

---

## 8) File Map (for quick reference)

- server/config.ts → getLuigiConfig(): reads AGENT_RUNNER_* envs
- server/services/agent-runner.ts → POST /agents/run client
- server/luigi/executor.ts → orchestration, persistence, response mapping
- server/routes/luigi.ts → API endpoints
- .agents/luigi_master_orchestrator.ts → orchestrator agent id

---

Happy shipping! Once the runner is live and env vars are set, your Luigi pipeline should hum along and populate messages/artifacts in real time.
Copy the agent runner from Codebuff!!!
https://www.npmjs.com/package/@codebuff/sdk
https://github.com/CodebuffAI/codebuff
