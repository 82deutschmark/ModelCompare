# Debate Regression Stabilization Plan

## Goal
Document the investigation and remediation steps for the debate view regression that reopens the setup panel and loses active transcript data after starting a session.

## Current Understanding
- Regression surfaces immediately after starting a fresh debate session.
- UI flashes back to the setup state because the client transcript is cleared while the stream is still running.
- Likely triggered by hydration logic that overwrites local state with stale server responses when the persistence layer has not caught up.

## Investigation Tasks
- [ ] Trace `useDebateSession.hydrateFromSession` to confirm when it resets local message state.
- [ ] Inspect the debate page effect that triggers hydration on `sessionDetailsQuery` completion for ordering/race issues.
- [ ] Verify how many turns are returned from `/api/debate/session/:id` while the first streaming response is in flight.

## Remediation Tasks
- [ ] Guard hydration so stale or empty payloads cannot clobber an active transcript.
- [ ] Preserve existing jury annotations and response tracking when the server payload is behind the client state.
- [ ] Regression test by simulating sequential hydration events to ensure the transcript remains visible.

## Validation
- Confirm the setup panel stays collapsed during an active debate run even while background refetches occur.
- Ensure resumed sessions with real turn history still hydrate correctly.
- Run the TypeScript type checker to catch structural issues introduced by the fix.
