---
description: Plan for assessing OAuth and billing test coverage
---

# 020926-oauth-billing-tests

## Objective
Ensure the existing automated test suite adequately covers Google OAuth authentication flows and billing/credits logic, adding or updating tests as needed.

## Context & References
- Authentication logic: `server/auth.ts`, `server/routes/auth.routes.ts`, `server/device-auth.ts`
- Billing/credits logic: `server/storage.ts`, `server/routes/billing.routes.ts` (if present), shared schemas under `shared/schema.ts`
- Test locations: `tests/server/**`, `tests/utils/**`, and mode-specific integration tests in `tests/server`

## Task List
- [ ] **Inventory Existing Coverage**
  - Identify all tests mentioning OAuth, Google auth routes, session handling, and billing/credit deductions. Primary directories: `tests/server/auth` (if exists), `tests/server/services`, `tests/server/arc`, and repo-wide search for `oauth`, `billing`, `stripe`, `credits` within `tests/`.
- [ ] **Execute Relevant Test Suites**
  - Run `npm run test -- auth` (or equivalent targeted command) if available, otherwise run scoped Vitest suites touching auth/billing. Capture failures.
- [ ] **Gap Analysis**
  - Compare implemented functionality (files listed above) against located tests. Document missing scenarios in this plan file with notes.
- [ ] **Implement/Add Tests** *(if gaps found)*
  - Update or create test files (e.g., `tests/server/auth/oauth.test.ts`, `tests/server/services/billing.test.ts`). Cover: successful OAuth login, session serialization, device credit merge, Stripe subscription enforcement, credit deduction edge cases.
- [ ] **Update Documentation**
  - Reflect test coverage findings in `README.md` or dedicated testing docs if behavior changed. Add entry to `CHANGELOG.md` summarizing test enhancements.
- [ ] **Verification**
  - Re-run affected test suites ensuring all pass. Document command outputs and summarize in final response.

## Notes
- Maintain SRP/DRY by reusing existing test utilities (see `tests/utils/**`).
- Avoid mocking external OAuth providers beyond existing helpers; prefer integration-style tests with stubs already present in repo.
- Respect existing env var assumptions from `AGENTS.md` regarding configured secrets.

## Findings — 2026-02-09
- `grep` scan over `tests/` produced **no references** to `oauth`, `google`, `billing`, `stripe`, or `credits`, indicating there are currently **zero automated tests** that exercise these flows.
- `npm run test` (full suite) fails during the dev server bootstrap step because `server/stripe.ts` instantiates `Stripe` without a configured API key, yielding: `Error: Neither apiKey nor config.authenticator provided`. The failure occurs before any test files execute, so the suite cannot complete until the Stripe environment variables are provided or the Stripe module is mocked/guarded inside tests.

## Coverage Strategy — 2026-02-09
1. **Stripe Service Contract Tests**
   - Mock storage + Stripe SDK to validate `createPaymentIntent`, `handleStripeWebhook`, `getCreditPackages`, and `validateStripeConfig` logic without live API calls.
   - Assert credit merges, transaction logging, and error handling for invalid packages, missing metadata, and payment failures.
2. **Auth Route Regression Tests**
   - Spin up lightweight Express apps that mount `authRoutes` + `creditsRoutes` with mocked Passport + storage to verify device fallback, OAuth session detection, and `/credits` reporting behavior.
   - Ensure anonymous device users retain credits and OAuth users surface merged balances.
3. **End-to-End Guardrail**
   - Add smoke test that boots the dev server with Stripe + OAuth mocks to ensure `npm run test` no longer hard-fails when secrets are absent (achieved by lazy Stripe client initialization + env validation helpers).

## Initial Test Suite Outline
- `tests/server/services/stripe.test.ts`
  - Covers payment intent creation, webhook success/failure paths, package catalog guarantees, and config validation.
- `tests/server/auth/oauth-device-merge.test.ts` *(planned)*
  - Will exercise `/api/auth/user` + credit merge logic using mocked Passport + storage to confirm the Google device merge rules do not regress.
- `tests/server/routes/credits-routes.test.ts` *(planned)*
  - Will verify `/api/stripe/create-payment-intent` + `/api/stripe/transactions` enforce authentication and propagate storage failures gracefully.

Each suite will rely on shared test fixtures under `tests/utils/` (auth/session stubs, mock request helpers) so new cases can be layered without re-implementing Express plumbing.
