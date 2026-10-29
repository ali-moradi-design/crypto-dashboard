# Project instructions

Live crypto dashboard (Vite + React SPA, no server). Scope: `docs/brief.md`;
architecture: `docs/architecture.md`.

## Workflow

- Small PRs: branch → local checks → PR → merge when the required check is green.
  Every merge to `main` deploys (`.github/workflows/docker.yml` → deploy-kit).
- Local checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`, `pnpm test:e2e`.
- Production: `dist` in an unprivileged Nginx image (`Dockerfile`, `nginx/`); the
  container sets the CSP and cache headers. Server files: `deploy/`.

## Language

- Explain in Persian. Put every English word or code name inside parentheses and
  backticks. Never start a line with an English word. Repo files are in English.

## graphify

Do not use graphify in this repo (decided 2026-10-29).
