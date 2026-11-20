"""python examples/python/scan.py <address> [chain]

Scans a token with the AGENT SI API and prints the SI Score. Standard library only.
"""
import json, sys, urllib.request

address = sys.argv[1] if len(sys.argv) > 1 else "0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e"
chain = sys.argv[2] if len(sys.argv) > 2 else "robinhood"
base = "https://agentsi.site"

req = urllib.request.Request(f"{base}/api/scan?address={address}&chain={chain}", headers={"User-Agent": "agentsi-example-py/1.0"})
with urllib.request.urlopen(req, timeout=120) as res:
    report = rank = None
    for raw in res:  # newline-delimited JSON, streamed as the scan runs
        ev = json.loads(raw)
        if ev["type"] == "step":
            print(f"  {ev['id']:<9} {ev['status']}")
        elif ev["type"] == "report":
            report, rank = ev["report"], ev.get("rank")
        elif ev["type"] == "error":
            raise SystemExit(ev["message"])

s = report["score"]
print(f"\n{report['token'].get('symbol') or address} on {report['chain']}: SI Score {s['points']}/100 {s['label']}" + (f" · #{rank['position']} of {rank['of']}" if rank else ""))
print(report["verdict"]["headline"])
for d in s["deductions"]:
    print(f"  -{d['points']}  {d['title']}")
print(f"\n{base}/scan/{report['chain']}/{report['address']}")
