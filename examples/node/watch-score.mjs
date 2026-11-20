// node examples/node/watch-score.mjs <address> <chain> [minutes]
// Re-scans a token on an interval and prints only when the SI Score or a finding changes.
// Use it as the core of an alert bot: swap console.log for your Telegram/Discord/webhook send.
const [address, chain = "robinhood", minutes = "10"] = process.argv.slice(2);
if (!address) throw new Error("usage: watch-score.mjs <address> <chain> [minutes]");
const base = process.env.AGENTSI_URL ?? "https://agentsi.site";
let last = null;

async function scan() {
  const res = await fetch(`${base}/api/scan?address=${address}&chain=${chain}&force=1`, { headers: { "user-agent": "agentsi-watch/1.0" } });
  if (res.status === 429) return console.warn(`rate limited, retry in ${res.headers.get("retry-after")}s`);
  const text = await res.text();
  const ev = text.trim().split("\n").map((l) => JSON.parse(l)).find((e) => e.type === "report");
  if (!ev) return console.warn("no report");
  const r = ev.report;
  const now = { points: r.score.points, label: r.score.label, flags: r.findings.filter((f) => !["pass", "info"].includes(f.severity)).map((f) => f.id).sort() };
  if (!last) console.log(`${new Date().toISOString()} ${r.token.symbol}: ${now.points}/100 ${now.label}`);
  else if (now.points !== last.points || now.flags.join() !== last.flags.join()) {
    const added = now.flags.filter((f) => !last.flags.includes(f));
    const gone = last.flags.filter((f) => !now.flags.includes(f));
    console.log(`${new Date().toISOString()} ${r.token.symbol}: ${last.points} → ${now.points} ${now.label}${added.length ? ` · new: ${added.join(", ")}` : ""}${gone.length ? ` · cleared: ${gone.join(", ")}` : ""}`);
  }
  last = now;
}
await scan();
setInterval(scan, Number(minutes) * 60_000);
