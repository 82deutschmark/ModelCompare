# Repository Guidelines

## Project Structure & Module Organization
- `client/` hosts the React 18 + Vite UI (pages, components, hooks); rely on the `@/` alias to avoid deep relative paths.
- `server/` owns the Express API (`server/index.ts`), route registration, templates, storage drivers, and Drizzle bootstrap. Keep HTTP handlers in `server/routes.ts`.
- `shared/` centralizes schemas, types, and the variable engine shared across runtimes. Documentation sits in `docs/`, generated output in `dist/`, and database migrations in `migrations/`.

## Build, Test, and Development Commands
- `npm run dev` starts the Express server with Vite middleware; use it during local development.
- `npm run build` emits the client bundle and bundles the server into `dist/`, and `npm run start` serves that output in production mode.
- `npm run check` runs TypeScript in no-emit mode across `client/`, `server/`, and `shared/`.
- `npm run db:push` applies Drizzle migrations; commit the resulting SQL in `migrations/`.
- Vitest is the preferred test runner; execute `npx vitest --run` for CI-style runs or `npx vitest --ui` while iterating.

## Coding Style & Naming Conventions
- Strict TypeScript is enforced (`tsconfig.json`), so declare explicit return types on exported functions and reuse shared interfaces.
- Follow the two-space indentation and import grouping pattern already present in `client/src/App.tsx`.
- Components stay PascalCase, hooks camelCase with a `use` prefix, route handlers verb-named, and shared constants in UPPER_SNAKE case.
- Prefer named exports; default exports are reserved for Vite pages.

## Testing Guidelines
- Co-locate specs beside their source as `*.test.ts` or `*.test.tsx`; tsconfig excludes them from production builds.
- Use React Testing Library for UI behavior and Vitest spies (`vi.fn`) for provider or network stubs.
- When APIs change, refresh fixtures in `shared/` so client and server leverage the same contracts.

## Commit & Pull Request Guidelines
- Match the existing git history: concise, imperative, scope-first summaries (for example `Fix battle chat template`).
- Each PR should include a problem statement, before/after context, screenshots for UI work, linked issues, and notes on migrations or environment changes.
- Update `docs/` and `shared/` contracts alongside code whenever architecture or API surfaces shift.

## Environment & Configuration Tips
- Load secrets from `.env` (read immediately in `server/index.ts`); do not commit credentials.
- Keep `drizzle.config.ts` aligned with `server/config.ts` whenever database URLs or migration directories move.