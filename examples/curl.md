# curl

```bash
# scan (streams progress lines, then the report)
curl -sN "https://agentsi.site/api/scan?address=0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e&chain=robinhood"

# just the score, with jq
curl -sN "https://agentsi.site/api/scan?address=<token>&chain=<chain>" | jq -c 'select(.type=="report") | {symbol:.report.token.symbol, points:.report.score.points, label:.report.score.label, rank}'

# latest stored report, no scan
curl -s "https://agentsi.site/api/report/<token>?chain=<chain>" | jq .report.score

# which chain is this address on?
curl -s "https://agentsi.site/api/detect?address=<token>"

# the board
curl -s "https://agentsi.site/api/rank?chain=robinhood&limit=20" | jq '.rows[] | [.symbol,.points,.label]'

# share card (PNG) and badge (SVG)
curl -so card.png  "https://agentsi.site/api/card/scan/<chain>/<token>"
curl -so badge.svg "https://agentsi.site/api/card/badge/<chain>/<token>"
```
