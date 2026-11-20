# AGENT SI — developer kit

[![SI Score](https://agentsi.site/api/card/badge/robinhood/0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e)](https://agentsi.site/scan/robinhood/0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e)

**Before you buy, ask SI.** AGENT SI is a token risk scanner that reads the chain itself: owner and proxy controls, mint and freeze authority, honeypot and tax simulation, liquidity, holder concentration (burns, pools and exchange custody separated), age, exchange listings. Every finding carries its source. The result is the **SI Score** (0–100) — what SI could verify, never where the price goes.

Live at **[agentsi.site](https://agentsi.site)** · Telegram **[@AskAgentSI_bot](https://t.me/AskAgentSI_bot)** · X **[@AskAgentSI](https://x.com/AskAgentSI)** · updates **[t.me/AgentSIHQ](https://t.me/AgentSIHQ)** · token **[$AGSI](https://agentsi.site/token)** on Robinhood Chain.

This repository is everything you need to put SI inside your own product: a zero-dependency SDK, the API contract, working examples (Node, Python, curl, a Telegram bot) and an embeddable live badge. The API is free during the public beta and needs no key.

## 30 seconds

```bash
curl -sN "https://agentsi.site/api/scan?address=0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e&chain=robinhood" \
  | jq -c 'select(.type=="report") | {symbol:.report.token.symbol, score:.report.score.points, tier:.report.score.label}'
# {"symbol":"AGSI","score":64,"tier":"WATCHLIST"}
```

```ts
import { AgentSI } from "@agentsilabs/sdk";
const si = new AgentSI({ client: "my-app" });
const { report } = await si.scan("0x…", { chain: "base" });
console.log(report.score.points, report.score.label, si.reportUrl("base", report.address));
```

## What's here

| Path | What |
|---|---|
| [`sdk/`](sdk) | `@agentsilabs/sdk` — TypeScript/JS client: `scan`, `report`, `detect`, `rank`, `health`, plus `reportUrl`, `cardUrl`, `badgeUrl`, `telegramUrl` |
| [`openapi.yaml`](openapi.yaml) | The public API contract |
| [`examples/node`](examples/node) | `scan.mjs` (stream a scan, print the score) · `watch-score.mjs` (alert when a score or finding changes) |
| [`examples/python`](examples/python) | Same scan, standard library only |
| [`examples/telegram-bot`](examples/telegram-bot) | A 40-line bot that answers pasted contracts with the SI Score and share card |
| [`examples/curl.md`](examples/curl.md) | Every endpoint from the terminal |
| [`embed/`](embed) | Live SVG badge, share card and "Scan on Telegram" button for token sites and READMEs |

## API in one table

| Endpoint | Returns | Limit / IP |
|---|---|---|
| `GET /api/scan?address=&chain=&force=1` | NDJSON stream: `step` events, then `{type:"report", report, cached, rank}` | 8 / min |
| `GET /api/report/<address>?chain=` | Latest stored report + history + rank (404 if never scanned) | 120 / min |
| `GET /api/detect?address=` | Which chain the address is on, and why | 30 / min |
| `GET /api/rank?chain=&limit=` | The SI Score board | 120 / min |
| `GET /api/health` | Whether every part of the engine answers | — |
| `GET /api/card/scan/<chain>/<address>` | 1200×630 PNG share card | 60 / min |
| `GET /api/card/badge/<chain>/<address>` | SVG badge with the live score (cached 5 min) | 120 / min |

Chain ids: `robinhood`, `solana`, `ethereum`, `base`, `bnb`, and [every chain with a live market](https://agentsi.site/chains). Leave `chain` out and SI detects it; if an address exists on several chains the scan returns `422` with the options instead of guessing.

Where to call it from: your server, bot, cron job or terminal. The API refuses calls made by **browsers on other websites** (so a cloned frontend cannot borrow the scanner). For a web page, use the badge or card (plain `<img>`), or proxy through your backend.

## Reading a report

- `score.points` 0–100 and `score.label`: **FORTIFIED** 85+, **SOLID** 65+, **WATCHLIST** 45+, **FRAGILE** 25+, **HAZARD** below.
- `score.deductions[]`: every point lost and why. `score.credits[]`: points given back (a major exchange listing).
- `score.confidence`: `verified` / `partial` / `thin` — how much of the core evidence SI actually saw. A thin scan is capped at 59 no matter how clean it looks.
- `findings[]`: each has `severity`, `title`, `evidence` and `source` (the kind of evidence, e.g. on-chain read, holder index, security scanner, market data).
- Two identity findings exist for SI's own token: `official-token` (the published $AGSI contract) and `impostor` (anything else using the AGENT SI name or ticker). They are identity only; $AGSI earns its score like every other token.

The full rule set, thresholds and correction policy: [agentsi.site/transparency](https://agentsi.site/transparency). Machine-readable summary for assistants: [agentsi.site/llms-full.txt](https://agentsi.site/llms-full.txt).

## Terms of use

Free, rate limited, beta: endpoints may change with notice in [t.me/AgentSIHQ](https://t.me/AgentSIHQ). Show the score as SI's assessment with a link to the report; do not alter the numbers or present them as your own audit. SI is research, not financial advice. The SDK, examples and docs here are MIT; the service, engine, data and marks are SI Labs'. Full terms: [agentsi.site/terms](https://agentsi.site/terms).

Built by [SI Labs](https://github.com/agentsilabshq).
