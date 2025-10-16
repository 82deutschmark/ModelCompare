/*
 * Author: OpenAI Codex CLI
 * Date: 2025-10-16 00:00 UTC
 * PURPOSE: End-to-end test plan to exercise Debate Mode streaming via the backend SSE endpoint
 *          using GPT-5 Mini vs GPT-5 Nano with default settings on the 13th default topic. This
 *          plan documents exact Windows PowerShell commands to start the dev server, trigger
 *          streaming for Turn 1 (AFFIRMATIVE) and Turn 2 (NEGATIVE), capture outputs, and inspect
 *          server logs for errors. It touches only the runtime and does not alter application code.
 * SRP/DRY check: Pass — This file is a single, self-contained test plan. No duplication with
 *                existing docs; complements existing Responses API and Debate docs.
 */

# Debate E2E Test — GPT-5 Mini vs Nano (Topic 13)

- Models: `gpt-5-mini-2025-08-07` (Affirmative) vs `gpt-5-nano-2025-08-07` (Negative)
- Defaults: adversarial intensity `3`, temperature `0.7`, maxTokens `16384`, reasoning on
- Topic 13 (from client/public/docs/debate-prompts.md):
  - "The Knights of the Sun in this episode had a valid point about self sacrifice for the most important job in the universe. Likewise  In the episode Morty balked at this idea, but it has merit and should be debated."

## Steps (PowerShell)

1) Start server in background and capture logs

```
New-Item -ItemType Directory -Path logs -Force | Out-Null
Start-Process -FilePath npm -ArgumentList 'run','dev' -WorkingDirectory '.' -RedirectStandardOutput 'logs\server-dev.out.log' -RedirectStandardError 'logs\server-dev.err.log'
Start-Sleep -Seconds 4
```

2) Turn 1 — AFFIRMATIVE (GPT-5 Mini)

```
$topic = 'The Knights of the Sun in this episode had a valid point about self sacrifice for the most important job in the universe. Likewise  In the episode Morty balked at this idea, but it has merit and should be debated.'
$body1 = @{ 
  modelId = 'gpt-5-mini-2025-08-07'; topic = $topic; role = 'AFFIRMATIVE'; intensity = 3;
  opponentMessage = $null; previousResponseId = $null; turnNumber = 1;
  model1Id = 'gpt-5-mini-2025-08-07'; model2Id = 'gpt-5-nano-2025-08-07'
} | ConvertTo-Json -Depth 6

$r1 = Invoke-WebRequest -Uri 'http://localhost:5000/api/debate/stream' -Method POST -ContentType 'application/json' -Body $body1 -TimeoutSec 600
$r1.Content | Out-File -FilePath 'logs\debate-turn1.sse.txt' -Encoding UTF8
```

3) Extract `sessionId` for chaining, then Turn 2 — NEGATIVE (GPT-5 Nano)

```
$sessionId = Select-String -Path 'logs\debate-turn1.sse.txt' -Pattern '"sessionId"\s*:\s*"([^"]+)' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -First 1

$body2 = @{ 
  modelId = 'gpt-5-nano-2025-08-07'; topic = $topic; role = 'NEGATIVE'; intensity = 3;
  opponentMessage = $null; previousResponseId = $null; turnNumber = 2;
  sessionId = $sessionId; model1Id = 'gpt-5-mini-2025-08-07'; model2Id = 'gpt-5-nano-2025-08-07'
} | ConvertTo-Json -Depth 6

$r2 = Invoke-WebRequest -Uri 'http://localhost:5000/api/debate/stream' -Method POST -ContentType 'application/json' -Body $body2 -TimeoutSec 600
$r2.Content | Out-File -FilePath 'logs\debate-turn2.sse.txt' -Encoding UTF8
```

4) Inspect logs for errors

```
Get-Content 'logs\server-dev.err.log' -Tail 200
Get-Content 'logs\server-dev.out.log' -Tail 200
```

Notes:
- These calls use the backend SSE endpoint and will finish each stream (route ends response on complete).
- If a model ID is unrecognized by the provider, the stream will emit an `error` event; check the server logs.
- OPENAI_API_KEY and other env vars must be present in `.env`.

