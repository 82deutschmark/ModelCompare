* Author: gpt-5-codex
* Date: 2025-10-16 17:52 UTC
* PURPOSE: Document how maintainers can run OpenAI provider verification locally without sharing credentials with the agent.
* SRP/DRY check: Pass - provides a single source of truth for OpenAI health-check setup without overlapping other testing docs.

# OpenAI Credential & Test Execution Guide

This guide explains how to run the OpenAI health check locally while keeping your API key private. Follow these steps whenever you need to verify the provider after updates to `server/providers/openai.ts`.

## 1. Prepare Your Environment
- Ensure dependencies are installed: `npm install`
- Create or update your `.env` file in the project root with the following entry:
  ```env
  OPENAI_API_KEY=sk-...
  ```
- Never paste or transmit the real key in chat or commit history.

## 2. Run the Targeted Health Check
Use the existing health-check script so we exercise the same path the server uses in production:
```bash
npm run health-check:openai
```
This command will:
- Load environment variables via `dotenv`
- Instantiate `OpenAIProvider`
- Issue a lightweight Responses API request for a sanity check
- Report latency and token usage details in the console

## 3. Share Sanitized Results
If you need assistance interpreting results:
1. Copy the console output **without** the raw request/response payloads or any bearer tokens.
2. Remove any references to secret environment paths.
3. Share the sanitized log snippet in chat so we can debug together.

## 4. Troubleshooting Checklist
- Confirm the `.env` file is being loaded (the script logs missing key warnings).
- Double-check that the model ID in the log matches one of the entries in `OpenAIProvider.models`.
- Ensure your network allows outbound traffic to `api.openai.com`.
- Retry with `DEBUG_SAVE_RAW=true` set in `.env` if deeper logs are required (files stay on your machine).

## 5. When to Re-run the Check
- After modifying `server/providers/openai.ts`
- After changing environment variables related to OpenAI
- Before deploying a new release that relies on OpenAI functionality

By keeping the credential on your machine and only sharing sanitized logs, we stay secure while still validating the fix.
