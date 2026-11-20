# @agentsilabs/sdk

Zero-dependency client for the AGENT SI API. Node 18+, Bun, Deno, edge runtimes.

```bash
npm i @agentsilabs/sdk
```

```ts
import { AgentSI } from "@agentsilabs/sdk";

const si = new AgentSI({ client: "my-bot" });

const { report, rank } = await si.scan("0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e", {
  chain: "robinhood",
  onStep: (s) => console.log(s.id, s.status),
});

console.log(report.token.symbol, report.score?.points, report.score?.label);   // AGSI 64 WATCHLIST
console.log(rank);                                                            // { position: 12, of: 40, chain: "robinhood" }
console.log(si.reportUrl("robinhood", report.address));
```

| Method | What it does |
|---|---|
| `scan(address, { chain?, force?, onStep? })` | Runs a scan (streamed progress), resolves with the report + rank |
| `report(address, chain?)` | Latest stored report, no scan; `null` if never scanned |
| `detect(address)` | Which chain an address lives on |
| `rank({ chain?, limit? })` | The SI Score board |
| `health()` | Engine status |
| `reportUrl / cardUrl / badgeUrl / telegramUrl` | Links and images, no API call |

Errors throw `AgentSIError` with `status` and, on 429, `retryAfter` seconds. Limits per IP: scans 8/min, detect 30/min, report and rank 120/min.
