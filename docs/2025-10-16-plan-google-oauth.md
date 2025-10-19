*
* Author: gpt-5-codex
* Date: 2025-10-16T00:00:00Z
* PURPOSE: Document plan to correct Google OAuth callback URLs for staging and production deployments, ensuring configuration updates propagate without breaking local development.
* SRP/DRY check: Pass - single document describing plan; confirmed no similar doc exists.

# Goal
Fix Google OAuth redirect configuration so staging and production deployments use their public domains instead of localhost, while keeping local development intact.

# Context
- Current callbackURL logic in `server/auth.ts` defaults to localhost when DOMAIN env var is missing.
- Production deployment hosted at https://compare.gptpluspro.com/.
- Staging deployment hosted at https://modelcompare-staging.up.railway.app/.
- Need robust environment-based selection without manual env var management per environment.

# Tasks
1. Investigate existing configuration utilities for environment detection.
2. Update OAuth callback URL resolution to cover production and staging domains, with fallback to environment variable when provided and default to localhost for dev.
3. Ensure new logic is well-documented and maintainable (possibly using helper function).
4. Review other places referencing DOMAIN for potential alignment.
5. Test lint/type build if necessary (time permitting).

# Risks and Mitigations
- **Risk**: Hard-coding domains reduces flexibility. **Mitigation**: Allow override via env var and centralize mapping for easy updates.
- **Risk**: Breaking local dev callback. **Mitigation**: Preserve localhost fallback when not in production/staging.
- **Risk**: Staging env detection failing. **Mitigation**: Use Railway-provided `RAILWAY_ENVIRONMENT` or custom env to differentiate; fallback to explicit `process.env.STAGING_DOMAIN` if necessary.

# Validation
- Verify TypeScript compiles (if running tests locally).
- Manual verification instructions for user: attempt OAuth flow on staging/prod to confirm redirect to correct domain.
