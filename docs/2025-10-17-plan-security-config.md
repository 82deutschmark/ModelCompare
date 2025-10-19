
*
* Author: GPT-5 Codex
* Date: 2025-10-17 and 14:15
* PURPOSE: Document the action plan for recalibrating Helmet and CORS defaults to match our hobby deployment needs while preserving production safeguards; references server/config.ts and server/index.ts.
* SRP/DRY check: Pass - new planning doc focuses on coordination only; verified no existing docs cover this exact scope.

# Security Middleware Relaxation Plan

- **Goal** clarify why Helmet/CORS exist, decide on default posture, and document the safe toggle path for hobby deployments.
- **Context** current defaults enable Helmet/CORS universally; complaints stem from strict CSP and credential handling.

## Tasks

1. Audit current middleware defaults and environment gates in `server/index.ts` and `server/config.ts`.
2. Decide on a lightweight configuration that keeps production secure but relaxes development/hobby defaults.
3. Update configuration logic and comments to reflect the new defaults.
4. Provide guidance on `.env` overrides and note any risks introduced by the relaxed defaults.

## Open Questions

- Do we anticipate any hosted production usage that would require forcing Helmet/CORS back on even in hobby mode?
- Are there downstream consumers (e.g., frontends served from alternate ports) that rely on permissive CORS?

## Deliverables

- Adjusted config ensuring Helmet/CORS default off in development while staying opt-in for production.
- Updated documentation/comments explaining how to re-enable middleware.
- Response to user summarizing rationale and trade-offs.

