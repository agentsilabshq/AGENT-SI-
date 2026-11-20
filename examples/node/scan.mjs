// node examples/node/scan.mjs <address> [chain]
// Scans a token and prints the SI Score, the findings that cost points, and the links to share.
const [address = "0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e", chain = "robinhood"] = process.argv.slice(2);
const base = process.env.AGENTSI_URL ?? "https://agentsi.site";

const res = await fetch(`${base}/api/scan?address=${encodeURIComponent(address)}&chain=${chain}`, { headers: { "user-agent": "agentsi-example/1.0" } });
if (!res.ok) throw new Error(`${res.status}: ${(await res.json()).error}`);

let report, rank;
for await (const line of lines(res.body)) {
  const ev = JSON.parse(line);
  if (ev.type === "step") process.stdout.write(`  ${ev.id.padEnd(9)} ${ev.status}${ev.ms ? ` ${ev.ms}ms` : ""}\n`);
  if (ev.type === "report") ({ report, rank } = ev);
  if (ev.type === "error") throw new Error(ev.message);
}

const s = report.score;
console.log(`\n${report.token.symbol ?? report.address} on ${report.chain}: SI Score ${s.points}/100 ${s.label}${rank ? ` · #${rank.position} of ${rank.of}` : ""}`);
console.log(report.verdict.headline);
for (const d of s.deductions) console.log(`  −${d.points}  ${d.title}`);
for (const c of s.credits ?? []) console.log(`  +${c.points}  ${c.title}`);
console.log(`\nReport  ${base}/scan/${report.chain}/${report.address}`);
console.log(`Card    ${base}/api/card/scan/${report.chain}/${report.address}`);
console.log(`Badge   ${base}/api/card/badge/${report.chain}/${report.address}`);

async function* lines(body) {
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const l = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (l) yield l;
    }
  }
}
