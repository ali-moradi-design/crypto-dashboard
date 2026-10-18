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

## Feature-Sliced Design

Code lives in layers. A layer may import only from layers below it.

```
src/
  app/        entry, store, providers, layout route, market sync, global styles
  pages/      dashboard
  widgets/    market-table, pair-header, chart-panel, order-book, trades-feed
  features/   toggle-favorite, price-alerts, switch-theme, switch-locale, switch-digits
  entities/   pair, ticker, order-book, trade, connection
  shared/     api (market-data port, gate adapter), lib (ws, format, i18n, raf-batcher),
              ui (shadcn), config
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
- subscribes each pair separately (Gate rejects a whole request if one pair is
  unknown) and ref-counts listeners, so two widgets share one subscription;
- drops a silent connection after 30 s and resubscribes everything on reconnect;
- reads hosts from config (`VITE_GATE_REST_URL`, `VITE_GATE_WS_URL`).

## Routing and languages

- URL: `/:lang/:pair`, for example `/fa/ETH_USDT`. Unknown values redirect to
  `/en/BTC_USDT`. The URL is the source of truth for the selected pair.
- The `/:lang` layout route sets `<html lang>` and `<html dir>`; i18next starts in
  the URL's language so the first paint is already translated.
- Persian is right-to-left. Layout uses logical classes (`ms-*`, `text-start`);
  prices sit in `<bdi>`; chart axes, order book and trades stay left-to-right.
- Numbers and dates use `Intl` with a locale tag from `formatLocale()`: Persian
  digits by default (`fa-u-ca-gregory`), Latin on request
  (`fa-u-ca-gregory-nu-latn`), always the Gregorian calendar.
- Static hosting must serve `index.html` for unknown paths (Nginx:
  `try_files $uri /index.html;`).

## Layout

- Desktop (≥ 1024 px): resizable panels with `react-resizable-panels` (through the
  shadcn/ui `resizable` component), like the panes in VS Code. The gaps between
  panels are the drag handles; they also work with the keyboard (arrow keys) and
  in right-to-left. Sizes are saved in `localStorage` and restored on load.
- The page itself never scrolls on desktop; long lists scroll inside their panel.
- Phones: the same panels stacked, with fixed heights.

## Price alerts

- Stored in `localStorage`; the direction (rises to / falls to) comes from the
  price at creation.
- A listener checks each frame's tickers; a crossed alert fires once (browser
  notification if allowed, plus an in-page notice) and is removed.
- Alerts work while the page is open; there is no server push.

## Data flow

```
Gate WebSocket ──► GateSource (parse, route by channel+pair)
                     │
                     ▼
               rAF batcher (latest value per key, one flush per frame)
                     │
                     ▼
               Redux store ──► components select only their own slice
```

- **Market-wide data** (tickers, pair info, sparklines, connection status) is
  synced by `app/model/market-sync.ts`, started once by `MarketDataRoot`.
- **Pair data** (order book, trades) is streamed by hooks inside the widgets that
  show it, so subscriptions follow the selected pair and stop on unmount.
- **Candles do not go through Redux.** The chart is imperative: history is set once
  and live candles are applied with `series.update()`. Keeping thousands of candles
  in the store would cost copying work for no other reader.
- The `MarketDataSource` is provided through a React context whose value never
  changes, so it causes no re-renders.

## Performance rules

- WebSocket messages are buffered and dispatched at most once per animation frame
  (`requestAnimationFrame`); the order book is also throttled to 4 updates per
  second (Gate sends 10) so it stays readable. Browsers pause it in hidden tabs, so nothing renders
  there; after a minute hidden the socket closes, and it reopens (with fresh
  snapshots) when the tab is visible.
- State is normalized (`{ "BTC_USDT": {...} }`). A ticker that did not change keeps
  its object identity, so its row does not re-render.
- Each market row subscribes to its own ticker. The sorted list selector returns
  the same array while the order is unchanged (`resultEqualityCheck`).
- Price ticks tint only the number (no background) by toggling a `data-flash`
  attribute on the DOM node in an effect, so
  the animation costs no React render.
- Trades are keyed by id and existing trade objects are kept, so only new rows
  render. Order book rows take primitive props only.
- Popovers with live values (price alerts) mount their content only while open.
- `Intl.NumberFormat` and `Intl.DateTimeFormat` instances are cached.
- High-frequency actions are hidden from Redux DevTools; Redux dev checks skip the
  market data paths.
- Unit tests assert render counts (`<Profiler>`): one row per ticker change, zero
  renders while the chart streams, one feed render per frame for many trades.

## React Compiler

React Compiler runs at build time (Babel preset through `@rolldown/plugin-babel`)
and memoizes components and hooks automatically, so the code does not need manual
`useMemo`, `useCallback` or `React.memo` for performance. `eslint-plugin-react-hooks`
reports code that breaks the Rules of React, which the compiler would skip.

## Bundle

- The chart widget (and `lightweight-charts`) is lazy-loaded in its own chunk.
- Vendor code is split into stable chunks (react, state, router, i18n, ui) that
  stay cached between deploys.

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
- The E2E fake exchange (`e2e/gate-mock.ts`) answers REST with `page.route()` and
  plays the WebSocket server with `page.routeWebSocket()`; any other external
  request is aborted. An axe scan fails on serious accessibility violations.
- Unit tests replace `lightweight-charts` with a recording fake (jsdom has no
  canvas); the real chart is covered by E2E.
- Locally, `CHROMIUM_PATH` can point Playwright to a preinstalled Chromium.

## UI: colors and type

- Tokens live in `src/app/styles/theme.css` as CSS variables, with the names
  shadcn/ui expects (`--background`, `--card`, `--primary`, ...). Dark is the
  default; `.dark` on `<html>` switches themes, and an inline script in
  `index.html` applies the saved theme before the first paint.
- Brand palette, teal to plum:
  `#006466 #065a60 #0b525b #144552 #1b3a4b #212f45 #272640 #312244 #3e1f47 #4d194d`
  ([coolors](https://coolors.co/006466-065a60-0b525b-144552-1b3a4b-212f45-272640-312244-3e1f47-4d194d)).
  It drives the primary color, accents and the brand gradient (`bg-brand-gradient`).
- Dark theme surfaces are neutral near-black panels (`--card: #0f0f12`) on a
  slightly lighter page (`--background: #1a1a1e`), in the style of exchange UIs.
- Market colors: `up` (teal-green) and `down` (red), plus `-soft` and `-flash`
  variants for depth bars and price flashes, and `chart-up` / `chart-down` for
  candles. The pairs were checked with a color-vision-deficiency validator
  (deuteranopia ΔE ≥ 8). Color is never the only signal: arrows next to numbers,
  hollow up candles and filled down candles.
- Text colors meet WCAG AA (4.5:1) on background and card in both themes.
- Fonts are self-hosted (Fontsource): Inter for Latin and Turkish, Vazirmatn for
  Persian (first in the stack when `lang="fa"`). Numbers use `tabular-nums` (the
  `tabular` utility) so live values do not shift columns.
- shadcn/ui components live in `src/shared/ui`, added one by one with
  `pnpm dlx shadcn@latest add <name>`.
