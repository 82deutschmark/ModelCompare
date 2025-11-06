<!--
 * Author: Codex GPT-5
 * Date: 2025-11-06 03:45 UTC
 * PURPOSE: Capture the integration plan for adding upstream OpenAI reference submodules and outline validation steps.
 * SRP/DRY check: Pass - single document describing scope for submodule additions.
-->

# Goal
Add reusable OpenAI reference repositories as git submodules without disrupting the existing build or project structure.

# Tasks
- Verify repository guidelines for submodule layout and headers.
- Add `openai-agents-js` submodule under `libs/` to keep external libraries isolated from core app code.
- Add `openai-chatkit-advanced-samples` submodule alongside the first for parity and future exploration.
- Update `.gitmodules` to confirm entries and ensure URLs are correct.
- Refresh the changelog with a new version entry noting the submodule additions.

# Status
- `openai-agents-js` added to `libs/openai-agents-js`.
- `openai-chatkit-advanced-samples` added to `libs/openai-chatkit-advanced-samples`.
- Changelog updated with version 0.4.36 capturing both submodule integrations.

# Next Steps
- Stage all changes and create a descriptive commit once changelog updates are complete.
- Share verification guidance (e.g., `git submodule status`) after commit.
