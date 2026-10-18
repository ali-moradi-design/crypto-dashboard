# Architecture

Decisions made on 2026-10-18. The product scope is in [brief.md](./brief.md).

## Stack

| Area            | Choice                                                   |
| --------------- | -------------------------------------------------------- |
| Build tool      | Vite 8, static SPA (no server)                           |
| UI library      | React 19 with React Compiler 1.0                         |
| Language        | TypeScript (strict), see "TypeScript versions" below     |
| Package manager | pnpm                                                     |
| Code structure  | Feature-Sliced Design (FSD)                              |
| State           | Redux Toolkit + react-redux                              |
| Routing         | React Router (`react-router` package)                    |
| i18n            | react-i18next; numbers and dates through `Intl`          |
| Styling         | Tailwind CSS + shadcn/ui                                 |
| Charts          | TradingView `lightweight-charts`                         |
| Market data     | Gate public API v4 (REST + WebSocket), behind an adapter |
| Unit tests      | Vitest + Testing Library                                 |
| E2E tests       | Playwright with mocked REST and WebSocket                |
| Lint and format | ESLint (typescript-eslint, react-hooks) + Prettier       |
| CI              | GitHub Actions                                           |

Libraries are added in the pull request that first needs them, not all at once.

## Feature-Sliced Design

Code lives in layers. A layer may import only from layers below it.

```
src/
  app/        entry point, providers (store, router, i18n), global styles
  pages/      full pages: dashboard
  widgets/    page blocks: market-table, chart-panel, order-book, trades-feed
  features/   user actions: toggle-favorite, search-pairs, set-price-alert, switch-locale
  entities/   domain objects: pair, ticker, candle, order-book, trade
  shared/     no business meaning: api/gate (exchange adapter), lib, ui, config
```

Rules:

- Imports go only downward: `pages → widgets → features → entities → shared`.
- Slices on the same layer do not import each other.
- Each slice exposes a public API in its `index.ts`; other code imports only from
  that file, never from files inside the slice.
- Inside a slice, code is grouped by segment: `ui`, `model`, `api`, `lib`, `config`.
- Path alias: `@/` points to `src/` (for example `@/shared/lib/format`).

## Exchange adapter

The app depends on a small interface (`MarketDataSource`), not on Gate directly.
Gate is the only implementation (`shared/api/gate`). The adapter:

- converts Gate payloads (numbers as strings, `BTC_USDT` pairs) into app types;
- owns the WebSocket: ping, reconnect with exponential backoff, resubscribe;
- reads hosts from config, so they can change without code changes.

## Live data and performance

- Market data lives in the Redux store, outside React components.
- WebSocket messages are buffered and dispatched at most once per animation frame
  (`requestAnimationFrame`), so the UI does not re-render for every message.
- State is normalized (`{ "BTC_USDT": {...} }`); components select only their own
  slice, and derived data uses memoized selectors (`createSelector`).
- High-frequency actions are hidden from Redux DevTools so it stays usable.
- Updates pause while the tab is hidden (`visibilitychange`).

## React Compiler

React Compiler runs at build time (Babel preset through `@rolldown/plugin-babel`)
and memoizes components and hooks automatically, so the code does not need manual
`useMemo`, `useCallback` or `React.memo` for performance. `eslint-plugin-react-hooks`
reports code that breaks the Rules of React, which the compiler would skip.

## TypeScript versions

- `typescript-7` (TypeScript 7, the native compiler) runs the type check:
  `pnpm typecheck`.
- `typescript` (TypeScript 6.0) is installed for tools that need the TypeScript
  JavaScript API: typescript-eslint and the editor. typescript-eslint does not
  support TypeScript 7 yet.
- When typescript-eslint supports TypeScript 7, drop the 6.0 package.

## Scripts

| Command             | What it does                   |
| ------------------- | ------------------------------ |
| `pnpm dev`          | start the dev server           |
| `pnpm build`        | production build into `dist/`  |
| `pnpm preview`      | serve the production build     |
| `pnpm typecheck`    | type check with TypeScript 7   |
| `pnpm lint`         | ESLint                         |
| `pnpm format`       | format all files with Prettier |
| `pnpm format:check` | check formatting (used in CI)  |
| `pnpm test`         | unit tests (Vitest)            |
| `pnpm test:e2e`     | E2E tests (Playwright)         |

## Testing and CI

- Unit tests (Vitest + Testing Library) sit next to the code: `Foo.test.tsx`.
- E2E tests (Playwright) live in `e2e/` and run against the production build on a
  desktop and a mobile viewport. Network calls to Gate are mocked, so tests never
  depend on the exchange.
- GitHub Actions runs on every pull request and on `main`:
  install → format → lint → typecheck → unit tests → build → E2E.
- Locally, `CHROMIUM_PATH` can point Playwright to a preinstalled Chromium.

## UI: colors and type

- Tokens live in `src/app/styles/theme.css` as CSS variables, with the names
  shadcn/ui expects (`--background`, `--card`, `--primary`, ...). Dark is the
  default; `.dark` on `<html>` switches themes, and an inline script in
  `index.html` applies the saved theme before the first paint.
- Brand palette, teal to plum:
  `#006466 #065a60 #0b525b #144552 #1b3a4b #212f45 #272640 #312244 #3e1f47 #4d194d`
  ([coolors](https://coolors.co/006466-065a60-0b525b-144552-1b3a4b-212f45-272640-312244-3e1f47-4d194d)).
  It drives the primary color, surfaces and the brand gradient (`bg-brand-gradient`).
- Market colors: `up` (green) and `down` (red), plus `-soft` and `-flash`
  variants for depth bars and price flashes. Color is never the only signal: an
  arrow or sign is always shown next to it.
- Every text color meets WCAG AA (4.5:1) on background, card and muted surfaces in
  both themes.
- Fonts are self-hosted (Fontsource): Inter for Latin and Turkish, Vazirmatn for
  Persian (first in the stack when `lang="fa"`). Numbers use `tabular-nums` (the
  `tabular` utility) so live values do not shift columns.
- shadcn/ui components live in `src/shared/ui`, added one by one with
  `pnpm dlx shadcn@latest add <name>`.
