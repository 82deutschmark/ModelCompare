* Author: gpt-5-codex
* Date: 2025-10-22 01:10 UTC
* PURPOSE: Outline tasks for correcting debate intensity payloads and updating rhetoric guidance text.
* SRP/DRY check: Pass - Planning document only enumerates current objectives without duplicating other docs.

# Plan - Debate Intensity Guidance Alignment

## Goals
- Ensure debate streaming requests transmit full textual rhetoric guidance instead of bare numeric levels.
- Update debate prompt documentation and UI descriptors to match the provided intensity definitions.
- Maintain backward compatibility for stored sessions while enriching prompt context for providers.

## Tasks
1. Extend the debate client service to expose the current intensity descriptor (level, heading, label, summary, full text).
2. Update debate start/continue flows to include the intensity descriptor strings when initiating streaming sessions.
3. Adjust streaming hook payload types and server debate routes to accept and prefer textual guidance while persisting numeric levels.
4. Refresh the debate prompt markdown intensities to the new phrasing provided by the user.
5. Update automated tests to validate the revised handshake payload contract.
6. Document the change in the changelog.
