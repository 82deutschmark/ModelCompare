* Author: gpt-5-codex
* Date: 2025-10-16 17:50 UTC
* PURPOSE: Define next steps for documenting secure credential handling and ensuring OpenAI verification flows stay testable without sharing secrets.
* SRP/DRY check: Pass - focused on planning tasks for credential guidance without duplicating execution docs that live elsewhere.

## Goal
Provide clear guidance for running OpenAI provider verification without transmitting credentials to the agent, and capture follow-up work for changelog updates.

## Current Context
- Previous remediation ensured Responses API payloads are schema-compliant, but regression testing still requires valid OpenAI credentials.
- User cannot share secrets through this interface; we must document how they can run checks locally.
- Changelog lacks an entry explaining the documentation guidance and current validation expectations.

## Tasks
1. Draft a credential-handling and test execution guide so maintainers can run `npm run health-check:openai` locally with their own `.env` values.
2. Update the changelog with a documentation entry summarizing the new guidance and reiterating that tests must be run locally with valid keys.
3. Confirm no code changes are necessary and communicate the testing limitation and instructions back to the user.

## Validation
- Ensure documentation explicitly states that credentials should stay local and highlights required environment variables and commands.
- Verify changelog reflects the documentation addition and indicates manual validation steps.
- Provide the user with a concise explanation of how to configure their environment and share sanitized test output if desired.
