// A minimal Telegram bot that answers any pasted contract address with its SI Score and the share card.
// No framework: long polling with fetch. Node 18+.
//   TELEGRAM_BOT_TOKEN=... node examples/telegram-bot/bot.mjs
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("set TELEGRAM_BOT_TOKEN");
const tg = (m, body) => fetch(`https://api.telegram.org/bot${token}/${m}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const base = process.env.AGENTSI_URL ?? "https://agentsi.site";
const ADDRESS = /\b(0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/;

let offset = 0;
for (;;) {
  const { result = [] } = await tg("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
  for (const u of result) {
    offset = u.update_id + 1;
    const msg = u.message;
    const m = msg?.text?.match(ADDRESS);
    if (!m) continue;
    const chatId = msg.chat.id;
    await tg("sendChatAction", { chat_id: chatId, action: "typing" });
    try {
      const res = await fetch(`${base}/api/scan?address=${m[1]}`, { headers: { "user-agent": "agentsi-tg-example/1.0" } });
      if (!res.ok) throw new Error((await res.json()).error);
      const ev = (await res.text()).trim().split("\n").map((l) => JSON.parse(l)).find((e) => e.type === "report" || e.type === "error");
      if (ev.type === "error") throw new Error(ev.message);
      const r = ev.report;
      const flags = r.findings.filter((f) => ["critical", "high", "medium"].includes(f.severity)).slice(0, 3).map((f) => `⚠️ ${f.title}`).join("\n");
      await tg("sendPhoto", {
        chat_id: chatId,
        photo: `${base}/api/card/scan/${r.chain}/${r.address}?t=${Date.now()}`,
        caption: `<b>${r.token.symbol ?? "Token"}</b> on ${r.chain}\nSI Score <b>${r.score.points}/100</b> — ${r.score.label}\n${flags || "✅ No notable flags"}\n\n<a href="${base}/scan/${r.chain}/${r.address}">Full report</a>`,
        parse_mode: "HTML",
      });
    } catch (e) {
      await tg("sendMessage", { chat_id: chatId, text: `SI could not scan that: ${e.message}` });
    }
  }
}
