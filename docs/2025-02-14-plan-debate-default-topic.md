*
* Author: gpt-5-codex
* Date: 2025-02-14 00:00 UTC
* PURPOSE: Document implementation plan for preselecting a default debate topic in the debate UI.
* SRP/DRY check: Pass - Documentation only and scoped to a single planning responsibility.

# Goal
Ensure the debate page loads with a valid debate topic selected by default so the UI is ready to launch without manual preset selection.

# Tasks
- Inspect current debate setup state management to understand how topics are selected and reset.
- Determine how debate topics are parsed and identify a reliable default topic identifier.
- Update debate setup state to allow dynamic default topic assignment rather than relying on a hard-coded identifier.
- Add an effect on the debate page that selects the first available topic once prompt data loads and no valid topic is chosen.
- Verify the DebateTopicSelector reflects the default topic and that resetting the setup re-applies the default selection.

# Validation
- Load the debate page locally and confirm a topic appears selected immediately after prompts load.
- Reset the debate setup and confirm the topic selection remains valid without manual input.
