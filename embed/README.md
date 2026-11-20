# Embed the SI Score

Two things any website can show without calling the API: the **badge** (small SVG, live score, refreshes every 5 minutes) and the **share card** (1200×630 PNG). Both link to the public report, where visitors can run a fresh scan themselves.

## Badge

```html
<a href="https://agentsi.site/scan/robinhood/0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e" target="_blank" rel="noopener">
  <img src="https://agentsi.site/api/card/badge/robinhood/0xffe4cc7ee5dfd6734631dfc65c0feef40428d33e" alt="SI Score" height="20">
</a>
```

Markdown (READMEs, docs):

```md
[![SI Score](https://agentsi.site/api/card/badge/<chain>/<token>)](https://agentsi.site/scan/<chain>/<token>)
```

`?label=Audit` changes the left text. Colours follow the tier: cyan (SOLID, FORTIFIED), grey (WATCHLIST), amber (FRAGILE), red (HAZARD). A token nobody has scanned yet shows "not scanned" until someone opens the report page.

## Share card

```html
<a href="https://agentsi.site/scan/<chain>/<token>"><img src="https://agentsi.site/api/card/scan/<chain>/<token>" width="600" alt="AGENT SI report"></a>
```

## Button that scans in Telegram

```html
<a href="https://t.me/AskAgentSI_bot?start=<chain>_<token>">Scan on Telegram</a>
```

`badge.html` in this folder is a complete page you can open locally.

Rules: the badge and card are rendered by AGENT SI from SI's own data; do not alter the numbers or present them as your own audit. The score says what SI could see, not where the price goes.
