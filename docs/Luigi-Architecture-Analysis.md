# Luigi Pipeline Architecture Analysis - Critical Findings
**Date**: 2025-10-04T14:17:00Z  
**Analyst**: Cascade using Claude 4 Sonnet  
**Status**: 🚨 SYSTEM INCOMPLETE - Cannot Execute

---

## Executive Summary

The Luigi workspace was built to integrate with an **external agent orchestration service** that:
1. ❌ **Does NOT exist** in this codebase
2. ❌ **Is NOT running** on your system
3. ❌ **Was never implemented** by the previous developer

**Current State**: The UI and database layers are complete, but there's **no execution engine**. It's like building a beautiful car dashboard without an engine.

---

## Architectural Design (As Implemented)

### Component Stack

```
┌─────────────────────────────────────────┐
│  Frontend (research-synthesis.tsx)       │ ✅ COMPLETE
│  - Form inputs (5 fields)                │
│  - Timeline visualization                │
│  - Message display                       │
│  - Artifact viewer                       │
└─────────────────────────────────────────┘
                   ↓ HTTP
┌─────────────────────────────────────────┐
│  Backend API (server/routes/luigi.ts)   │ ✅ COMPLETE
│  - POST /api/luigi/runs                  │
│  - GET /api/luigi/runs/:id              │
│  - GET /api/luigi/runs/:id/messages     │
│  - POST /api/luigi/runs/:id/replies     │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Executor (server/luigi/executor.ts)    │ ✅ COMPLETE
│  - createRun()                           │
│  - startRun()                            │
│  - launchOrchestrator()                  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  REST Client (server/services/          │ ✅ COMPLETE
│               agent-runner.ts)           │
│  - callAgentByRest()                     │
│  - Builds HTTP request                   │
└─────────────────────────────────────────┘
                   ↓ fetch()
┌─────────────────────────────────────────┐
│  EXTERNAL SERVICE                        │ ❌ MISSING
│  Expected at: http://localhost:8700     │
│  POST /agents/run                        │
│                                          │
│  Would execute:                          │
│  - 72 Luigi agent definitions            │
│  - 60+ sequential stages                 │
│  - AI model calls (GPT-5, Claude, etc.) │
│  - Artifact generation                   │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Database (PostgreSQL/In-Memory)        │ ✅ COMPLETE
│  - luigi_runs                            │
│  - luigi_messages                        │
│  - luigi_artifacts                       │
└─────────────────────────────────────────┘
```

---

## What Happens When You Submit the Form

### Step-by-Step Execution Trace

**1. User submits form** ✅
```typescript
// client/src/pages/research-synthesis.tsx:83
const handleCreateRun = async (values: LuigiRunFormValues) => {
  const response = await createRun.mutateAsync(values);
  // Returns immediately with run ID
}
```

**2. API creates database record** ✅
```typescript
// server/routes/luigi.ts:38
router.post('/runs', async (req, res) => {
  const runContext = await executor.createRun(params);
  // Run stored in database, status: "pending"
  
  const context = await executor.startRun(runContext.run.id);
  // Status changed to "running"
  
  res.status(201).json({ run: context.run });
  // ✅ Returns success to frontend
});
```

**3. Executor tries to launch orchestrator** ❌
```typescript
// server/luigi/executor.ts:87
void this.launchOrchestrator(runId).catch(async (error: unknown) => {
  // Error caught silently here
  await storage.updateLuigiRun(runId, { status: "failed" });
});
```

**4. REST client attempts external call** ❌
```typescript
// server/services/agent-runner.ts:60
const response = await fetch('http://localhost:8700/agents/run', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'luigi-master-orchestrator',
    input: { runId, missionName, objective, ... }
  })
});
// ❌ FETCH FAILS: ECONNREFUSED - Nothing listening on port 8700
```

**5. Error handling** ⚠️
```typescript
// server/luigi/executor.ts:92
await storage.appendLuigiMessage({
  runId,
  role: "system",
  content: `Luigi run failed: ${error.message}`,
});
// Error saved to database, but frontend may not see it immediately
```

**6. Frontend polls for updates** 🔄
```typescript
// client/src/hooks/useLuigiApi.ts:37
useQuery({
  queryKey: ["luigi", "run", runId],
  refetchInterval: 4000, // Poll every 4 seconds
});
// Eventually sees status: "failed"
```

---

## The Missing Service

### What localhost:8700 Should Be

Based on the agent definitions and REST client interface, the missing service should:

**1. Accept Agent Run Requests**
```typescript
POST /agents/run
Content-Type: application/json

{
  "agentId": "luigi-master-orchestrator",
  "input": {
    "runId": "uuid-here",
    "missionName": "Stump Grinding Business",
    "objective": "Start a stump grinding business...",
    "constraints": "...",
    "successCriteria": "...",
    "stakeholderNotes": "..."
  }
}
```

**2. Load Agent Definitions**
- Read from `.agents/luigi/*.ts` directory
- Parse AgentDefinition objects
- Map agent IDs to configurations

**3. Execute Agent Pipeline**
- Start with `luigi-master-orchestrator`
- Progress through 60+ stages sequentially
- Call AI models (OpenAI GPT-5, Claude 4, etc.)
- Execute tools (read_files, think_deeply, etc.)
- Generate artifacts per stage

**4. Return Progress Updates**
```typescript
{
  "runId": "uuid",
  "status": "running" | "completed" | "failed",
  "currentStageId": "identify-purpose-task",
  "stageSnapshots": {
    "start-time-task": { "status": "completed", "completedAt": "..." },
    "setup-task": { "status": "completed", "completedAt": "..." },
    "identify-purpose-task": { "status": "in-progress", "startedAt": "..." }
  },
  "messages": [
    {
      "role": "stage-lead",
      "stageId": "setup-task",
      "content": "Initialized project structure",
      "reasoning": "..."
    }
  ],
  "artifacts": [
    {
      "stageId": "setup-task",
      "type": "markdown",
      "title": "Project Initialization",
      "data": { ... }
    }
  ],
  "costCents": 1234,
  "nextAction": "continue"
}
```

### Technologies This Service Might Use

Based on the agent definitions (`.agents/types/agent-definition.ts`):

1. **Codebuff Agent Framework** - The type definitions match Codebuff's agent system
2. **OpenRouter** - Agent models use OpenRouter format: `"openai/gpt-5-mini"`
3. **MCP (Model Context Protocol)** - For tool/resource access
4. **Node.js/TypeScript** - To load and execute agent definitions

---

## Why the Previous Developer Left It Incomplete

### Evidence of Rushed Implementation

**1. No Environment Variable Set**
```bash
# .env should have:
AGENT_RUNNER_BASE_URL=http://localhost:8700
AGENT_RUNNER_API_KEY=secret-key-here

# But these aren't documented anywhere
```

**2. No Setup Instructions**
- No README section for Luigi setup
- No documentation on starting the agent runner
- No docker-compose or service configuration

**3. Agent Definitions Created But Not Integrated**
- 72 agent files in `.agents/luigi/`
- All follow proper AgentDefinition format
- But no execution engine to load them

**4. Silent Failure Pattern**
```typescript
// server/luigi/executor.ts:87
void this.launchOrchestrator(runId).catch(...)
```
Using `void` means "fire and forget" - the API returns success even though execution will fail.

---

## Options to Fix This

### Option 1: Build Internal Agent Executor (HARD - 2-3 weeks)

**Implement the missing service inside this codebase:**

```
server/
  luigi/
    executor.ts (existing)
    orchestrator.ts (NEW - loads and runs agents)
    agent-loader.ts (NEW - parses .agents/luigi/*.ts)
    tool-executor.ts (NEW - implements tools)
    stage-manager.ts (NEW - tracks stage progression)
```

**Requirements:**
- Parse TypeScript agent definitions dynamically
- Implement tool system (read_files, think_deeply, spawn_agents, etc.)
- Call AI providers (OpenAI, Claude, etc.) per agent model
- Track stage dependencies from `.agents/LUIGI.md`
- Generate artifacts per stage
- Handle errors and retries
- Implement orchestrator logic

**Pros:**
- Everything in one codebase
- No external dependencies
- Full control

**Cons:**
- Complex implementation (500+ lines of code)
- Reinventing existing frameworks
- Lots of edge cases to handle
- Time-consuming

### Option 2: Use Codebuff Agent Runner (EASY - 1-2 days)

**Install and configure Codebuff's agent execution service:**

```bash
# Install Codebuff CLI
npm install -g codebuff

# Start agent runner locally
codebuff serve --port 8700 --agents-dir .agents/luigi

# Update .env
AGENT_RUNNER_BASE_URL=http://localhost:8700
AGENT_RUNNER_API_KEY=cb_your_api_key_here
```

**Pros:**
- Agent definitions already in correct format
- Minimal code changes needed
- Built-in tool system
- Handles AI model routing

**Cons:**
- External dependency
- Need Codebuff account/API keys
- Service must run separately

### Option 3: Simplify to Direct AI Calls (MEDIUM - 3-5 days)

**Remove agent orchestration, call AI models directly:**

```typescript
// server/luigi/simple-executor.ts
async function executeBusinessPlan(params: LuigiRunParams) {
  // Single Claude 4.1 Opus call with comprehensive prompt
  const prompt = buildBusinessPlanPrompt(params);
  
  const response = await anthropicProvider.generateResponse({
    model: 'claude-4.1-opus',
    prompt,
    maxTokens: 64000
  });
  
  // Parse response into sections (assumptions, risks, WBS, etc.)
  const sections = parseBusinessPlanSections(response);
  
  // Save as artifacts
  for (const section of sections) {
    await storage.saveLuigiArtifact({
      runId,
      stageId: section.type,
      type: 'markdown',
      title: section.title,
      data: { content: section.content }
    });
  }
}
```

**Pros:**
- Uses existing AI provider infrastructure
- No external service needed
- Simpler architecture
- Faster execution

**Cons:**
- Loses 60-stage granularity
- No intermediate progress updates
- Single point of failure
- Less sophisticated than agent pipeline

### Option 4: Mock for Demo Purposes (FAST - 2-4 hours)

**Create fake responses for testing UI:**

```typescript
// server/luigi/mock-executor.ts
async function mockLuigiExecution(runId: string) {
  const stages = LUIGI_STAGES;
  
  for (let i = 0; i < stages.length; i++) {
    await delay(2000); // 2 seconds per stage
    
    await storage.updateLuigiRun(runId, {
      currentStageId: stages[i].id,
      stages: { [stages[i].id]: { status: 'completed' } }
    });
    
    await storage.appendLuigiMessage({
      runId,
      role: 'agent',
      stageId: stages[i].id,
      content: `Completed ${stages[i].label}`
    });
  }
  
  await storage.updateLuigiRun(runId, { status: 'completed' });
}
```

**Pros:**
- Demonstrates UI functionality
- Tests database persistence
- Shows stage progression
- Quick to implement

**Cons:**
- No real AI output
- Not production-ready
- Doesn't generate actual business plans

---

## Recommended Approach

**For Immediate Testing**: **Option 4** (Mock Executor)
- Lets you see if the UI works correctly
- Validates database schema
- Tests polling mechanism
- Takes 2-4 hours

**For Production**: **Option 3** (Simplified Direct Calls)
- Pragmatic for hobby project
- Uses existing provider infrastructure
- Delivers real value
- 3-5 days of work

**If You Have Budget**: **Option 2** (Codebuff)
- Most feature-complete
- Leverages existing agent definitions
- Professional orchestration
- Requires subscription

---

## Testing Strategy

### Test the Current Failure

```bash
# In one terminal, try to hit the missing service:
curl http://localhost:8700/agents/run
# Expected: Connection refused

# Create a run via the UI or API:
curl -X POST http://localhost:5000/api/luigi/runs \
  -H "Content-Type: application/json" \
  -d '{
    "missionName": "Test Run",
    "objective": "Test the system"
  }'

# Get run status (will show "failed"):
curl http://localhost:5000/api/luigi/runs/{runId}

# Get messages (will show failure message):
curl http://localhost:5000/api/luigi/runs/{runId}/messages
```

### What You'll See

1. **Frontend**: Form submits successfully
2. **Database**: Run created with status "running"
3. **Backend logs**: Connection error to localhost:8700
4. **Database**: Run status changes to "failed"
5. **Messages table**: Error message saved
6. **Frontend**: Eventually polls and sees "failed" status

---

## Conclusion

The Luigi workspace is **architecturally sound but functionally incomplete**. The previous developer built:
- ✅ Complete database schema
- ✅ Complete REST API
- ✅ Complete frontend UI
- ✅ Complete agent definitions (72 files)
- ❌ **NO execution engine**

It's like they built a complete car except for the engine, then drove away.

**Your Options:**
1. Build the engine from scratch (hard)
2. Buy a third-party engine (Codebuff)
3. Simplify to a simpler engine (direct AI calls)
4. Put a fake engine in for demo purposes (mock)

**My Recommendation**: Start with Option 4 to validate everything works, then implement Option 3 for production use.
