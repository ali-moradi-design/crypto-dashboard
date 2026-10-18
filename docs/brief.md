# Crypto dashboard: brief

Decisions from 2026-10-17. Demo 8 in the portfolio roadmap (live crypto dashboard),
the first static demo (roadmap phase 7). The build happens in this public repo
`ali-moradi-design/crypto-dashboard`; this file is the handoff from the roadmap.

## Change log

- 2026-10-18: the data source is **Gate** (gate.io), not Binance. Binance blocks
  some regions (HTTP 451), and the demo must open without a VPN from Iran as well
  as from abroad. Iranian exchanges were rejected because they are not reachable
  from outside Iran. Gate was tested from Iran (REST and WebSocket, no VPN) and
  from a server abroad; its REST API sends `Access-Control-Allow-Origin: *`, so the
  browser can call it directly.

## How the build session starts

The user knows nothing about crypto trading. Work in this order:

1. Check the prerequisites (below) and report the results before writing code.
2. Explain the domain simply, with examples (section "Domain basics"), one idea
   at a time, and check the user understood.
3. Copy this brief into the repo as `docs/brief.md`.
4. Build step by step, in small pull requests (branch → PR → CI → squash merge),
   explaining each step. The user says when to move on.

Language rules for the session: explain in Persian, every English term inside
parentheses and backticks, never start a line with an English word, files in the
repo are written in English.

## Prerequisites to check first

- `git --version`, `node --version` (current LTS), `pnpm --version`.
- The working folder is a clone of `ali-moradi-design/crypto-dashboard`
  (`git remote -v`), clean (`git status`). Report what is already in the repo.
- GitHub access works (fetch/push).
- Gate public market data is reachable from the user's network, without a VPN:
  `curl -s "https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT"`
  returns JSON, and `wss://api.gateio.ws/ws/v4/` accepts a connection.
- Playwright can run locally (it is needed for E2E tests).
- Figma is not needed for this project.

## Domain basics (to teach first)

- A trading pair: `BTC/USDT` means the price of one Bitcoin in USDT (a coin pegged
  to 1 US dollar). Gate writes it as `BTC_USDT`. Main pairs for the demo: BTC, ETH,
  SOL, BNB, XRP, ADA, DOGE and others against USDT, about 20 in total.
- 24h change: how much the price moved in the last 24 hours, in percent.
- Volume: how much was traded in a period; it shows how active a market is.
- Candlestick: one bar per time period (1 minute, 1 hour, 1 day) with four prices:
  open, high, low, close. Green when the close is above the open, red when below.
- Order book: the waiting offers. Bids = people who want to buy and at what price;
  asks = people who want to sell. The gap between the best bid and the best ask is
  the spread.
- Trades: the deals that actually happened (price, amount, time, buy or sell side).
- Why live data is hard: the exchange sends dozens of messages per second; the UI
  must stay smooth.

## Scope

One page plus a pair detail view (or one page with a selected pair). No server,
no database, no login. Static build, deployed to `/srv/static/crypto-dashboard`
(the deploy itself is done later in roadmap sessions, steps 7.2 and 7.3).

1. Market table: ~20 pairs, live price flashing green/red on change, 24h change,
   volume, sparkline; sort, search, favorites (stored in localStorage).
2. Candlestick chart for the selected pair: intervals 1m, 5m, 15m, 1h, 4h, 1d,
   with volume bars. History once from REST (candlesticks), then live from
   WebSocket. Library: TradingView `lightweight-charts` (its license asks for
   attribution to TradingView; add it).
3. Order book with depth bars, best bid/ask and spread.
4. Recent trades, live.
5. Header stats: last price, 24h high/low, 24h volume.
6. Price alerts: target price per pair, browser notification when crossed
   (stored locally only).
7. A visible note: "Not financial advice."

Out of scope for now: portfolio tracking, accounts, a second exchange (the adapter
layer makes it easy to add later).

## Data source: Gate API v4

Public market data only, no API key. Pair format `BASE_QUOTE` (e.g. `BTC_USDT`).

REST, base `https://api.gateio.ws/api/v4`:

| Data | Endpoint |
|---|---|
| All tickers (price, 24h change, volume, high/low) | `GET /spot/tickers` (optional `currency_pair`) |
| Candle history | `GET /spot/candlesticks?currency_pair=&interval=&limit=` |
| Order book snapshot | `GET /spot/order_book?currency_pair=&limit=&with_id=true` |
| Recent trades | `GET /spot/trades?currency_pair=&limit=` |

WebSocket, `wss://api.gateio.ws/ws/v4/`. Subscribe with
`{"time": <unix s>, "channel": "<name>", "event": "subscribe", "payload": [...]}`:

| Data | Channel | Payload |
|---|---|---|
| Ticker | `spot.tickers` | `["BTC_USDT", ...]` |
| Candles | `spot.candlesticks` | `["1m", "BTC_USDT"]` (one pair+interval per subscribe) |
| Order book (top N snapshot) | `spot.order_book` | `["BTC_USDT", "20", "100ms"]` |
| Trades | `spot.trades` | `["BTC_USDT", ...]` |

Notes:

- Numbers arrive as strings; parse them once in the adapter.
- Keep the connection alive with `spot.ping` (the server answers `spot.pong`).
- Candle intervals used by the app (`1m 5m 15m 1h 4h 1d`) all exist on Gate.
- Public REST is rate-limited (about 200 requests per 10 s per endpoint); load
  tickers for all pairs in one `/spot/tickers` call, not one call per pair.
- Hosts live in config (env variables with defaults) so they can change without
  code changes.

## Technical decisions

- Vite + React + TypeScript, static SPA (no SEO need, no server).
- Exchange adapter: the app depends on a small interface (subscribe to ticker,
  candles, order book, trades; fetch history), not on Gate directly. Gate is the
  only implementation for now. Hosts are configurable.
- Performance: messages are buffered and applied once per animation frame
  (`requestAnimationFrame`); market data lives in a store outside React with
  selectors (or `useSyncExternalStore`) so only changed rows re-render.
- Connection health: status indicator, reconnect with exponential backoff,
  "data is stale" warning, pause updates while the tab is hidden
  (`visibilitychange`), resubscribe on reconnect.
- Tests: unit tests (Vitest) for the store, message parsing, formatting and
  reconnect logic; Playwright E2E with a mocked WebSocket and mocked REST, so CI
  never depends on the exchange.
- CI on GitHub Actions like the portfolio: install → lint → typecheck → unit →
  build → E2E; required check on `main`, merges only through PRs.

## UI

The user has no design in mind: pick a clean, ready-made look, to be refined later.

- Tailwind CSS + shadcn/ui components.
- Dark theme by default (usual for trading tools), light theme toggle.
- Green/red for up/down, but never color alone: also an arrow or sign
  (accessibility, color blindness).
- Numbers in a tabular (monospaced digits) font so columns do not jump.
- Responsive: the table and chart must work on a phone.

## Languages

- English (default), Turkish, Persian. Persian is RTL (`dir="rtl"` on `html`).
- Locale in the URL or a switcher; logical CSS only (`ms-*`, `me-*`, `text-start`).
- Prices, amounts and pair names stay LTR inside RTL text; chart axes are not
  mirrored.
- Numbers and dates through `Intl`. Persian shows native digits by default with a
  setting to switch to Latin digits. Gregorian calendar.
- Fonts: a Latin font plus Vazirmatn for Persian.

## Repo

- `ali-moradi-design/crypto-dashboard` (public), subdomain
  `crypto-dashboard.ali-moradi-develop.com`.
- README: what it shows (live data, performance techniques, adapter pattern,
  testing without the network), screenshots, the TradingView attribution, the
  "not financial advice" note, and that market data comes from Gate's public API.
