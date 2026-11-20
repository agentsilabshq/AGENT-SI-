/**
 * AGENT SI developer SDK — a zero-dependency client for the public API at agentsi.site.
 *
 * Works anywhere `fetch` exists (Node 18+, Bun, Deno, Cloudflare Workers, Vercel).
 * Call it from your server, bot or job. The API refuses calls made by browsers
 * on other websites, so for a web page use the badge or the share card instead
 * (see /embed in this repo) or proxy through your own backend.
 */

export type ChainId = string;
export type Severity = "critical" | "high" | "medium" | "low" | "info" | "pass" | "unknown";
export type Posture = "critical" | "high" | "elevated" | "moderate" | "low";
export type ScoreTier = "fortified" | "solid" | "watchlist" | "fragile" | "hazard";

export interface Finding {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  evidence: string;
  source: string;
}

export interface SiScore {
  /** 0–100 */
  points: number;
  tier: ScoreTier;
  /** "FORTIFIED" | "SOLID" | "WATCHLIST" | "FRAGILE" | "HAZARD" */
  label: string;
  confidence: "verified" | "partial" | "thin";
  checks: { checked: number; total: number };
  deductions: { id: string; title: string; points: number }[];
  credits?: { id: string; title: string; points: number }[];
}

/** The public report. Fields beyond these exist (market, holders, control…); see the API docs for the full shape. */
export interface Report {
  id: string;
  address: string;
  chain: ChainId;
  createdAt: string;
  mode: "live" | "demo";
  token: { name: string | null; symbol: string | null; decimals: number | null; [k: string]: unknown };
  findings: Finding[];
  posture: Posture;
  coverage: { checked: number; total: number };
  score?: SiScore;
  verdict: { headline: string; text: string };
  durationMs: number;
  [k: string]: unknown;
}

export interface ScoreRank {
  position: number;
  of: number;
  chain: ChainId;
}

export type ScanStep = { type: "step"; id: string; status: "running" | "done" | "failed" | "skipped"; detail?: string; ms?: number };
export type ScanEvent = ScanStep | { type: "report"; report: Report; cached: boolean; rank?: ScoreRank } | { type: "error"; code: "invalid" | "failed"; message: string };

export interface RankRow {
  address: string;
  chain: ChainId;
  symbol: string | null;
  name: string | null;
  points: number;
  tier: ScoreTier;
  label: string;
  posture: Posture;
  liquidityUsd: number | null;
  scannedAt: string;
  scanCount: number;
}

export interface DetectResult {
  chain: ChainId | null;
  reason?: "market" | "code" | "ambiguous" | "none" | string;
  options?: ChainId[];
  [k: string]: unknown;
}

export class AgentSIError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryAfter?: number, public readonly body?: unknown) {
    super(message);
    this.name = "AgentSIError";
  }
}

export interface ClientOptions {
  /** API origin; the production site by default */
  baseUrl?: string;
  /** Sent as User-Agent / X-Client so SI can tell integrations apart. Put your project name here. */
  client?: string;
  fetch?: typeof fetch;
}

export interface ScanOptions {
  /** Chain id ("robinhood", "solana", "ethereum", "base", "bnb", …). Omit to let SI detect it. */
  chain?: ChainId;
  /** Re-read the chain even when a fresh report is cached. */
  force?: boolean;
  /** Called for every progress step as it streams in. */
  onStep?: (step: ScanStep) => void;
  signal?: AbortSignal;
}

export class AgentSI {
  readonly baseUrl: string;
  private readonly client: string;
  private readonly f: typeof fetch;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "https://agentsi.site").replace(/\/$/, "");
    this.client = opts.client ?? "agentsi-sdk";
    this.f = opts.fetch ?? globalThis.fetch;
    if (!this.f) throw new Error("No fetch available: pass one in ClientOptions.fetch");
  }

  /** Run a scan and resolve with the final report (and its rank). Progress steps arrive through onStep. */
  async scan(address: string, opts: ScanOptions = {}): Promise<{ report: Report; cached: boolean; rank?: ScoreRank }> {
    const q = new URLSearchParams({ address });
    if (opts.chain) q.set("chain", opts.chain);
    if (opts.force) q.set("force", "1");
    const res = await this.f(`${this.baseUrl}/api/scan?${q}`, { headers: this.headers(), signal: opts.signal });
    if (!res.ok) throw await this.error(res);
    if (!res.body) throw new AgentSIError("Empty response", res.status);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let result: { report: Report; cached: boolean; rank?: ScoreRank } | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const ev = JSON.parse(line) as ScanEvent;
        if (ev.type === "step") opts.onStep?.(ev);
        else if (ev.type === "report") result = { report: ev.report, cached: ev.cached, rank: ev.rank };
        else if (ev.type === "error") throw new AgentSIError(ev.message, ev.code === "invalid" ? 400 : 502);
      }
    }
    if (!result) throw new AgentSIError("The scan ended without a report", 502);
    return result;
  }

  /** The latest report SI already holds for a token, without scanning. 404 → null. */
  async report(address: string, chain?: ChainId): Promise<{ report: Report; history: unknown[]; scanCount: number; rank: ScoreRank | null } | null> {
    const q = chain ? `?chain=${encodeURIComponent(chain)}` : "";
    const res = await this.f(`${this.baseUrl}/api/report/${encodeURIComponent(address)}${q}`, { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw await this.error(res);
    return (await res.json()) as { report: Report; history: unknown[]; scanCount: number; rank: ScoreRank | null };
  }

  /** Which chain an address belongs to, and why. */
  async detect(address: string): Promise<DetectResult> {
    const res = await this.f(`${this.baseUrl}/api/detect?address=${encodeURIComponent(address)}`, { headers: this.headers() });
    if (!res.ok) throw await this.error(res);
    return (await res.json()) as DetectResult;
  }

  /** The SI Score board: every scanned token, best first. */
  async rank(opts: { chain?: ChainId; limit?: number } = {}): Promise<{ rows: RankRow[]; total: number; chains: ChainId[]; at: string }> {
    const q = new URLSearchParams();
    if (opts.chain) q.set("chain", opts.chain);
    if (opts.limit) q.set("limit", String(opts.limit));
    const res = await this.f(`${this.baseUrl}/api/rank?${q}`, { headers: this.headers() });
    if (!res.ok) throw await this.error(res);
    return (await res.json()) as { rows: RankRow[]; total: number; chains: ChainId[]; at: string };
  }

  /** Whether every part of the engine is answering. */
  async health(): Promise<Record<string, unknown>> {
    const res = await this.f(`${this.baseUrl}/api/health`, { headers: this.headers() });
    return (await res.json()) as Record<string, unknown>;
  }

  // ---- URLs you can put in front of people (no API call needed)

  /** The public report page. */
  reportUrl(chain: ChainId, address: string) {
    return `${this.baseUrl}/scan/${chain}/${encodeURIComponent(address)}`;
  }
  /** 1200×630 share card (PNG). */
  cardUrl(chain: ChainId, address: string) {
    return `${this.baseUrl}/api/card/scan/${chain}/${encodeURIComponent(address)}`;
  }
  /** Small SVG badge with the current SI Score. */
  badgeUrl(chain: ChainId, address: string, label?: string) {
    return `${this.baseUrl}/api/card/badge/${chain}/${encodeURIComponent(address)}${label ? `?label=${encodeURIComponent(label)}` : ""}`;
  }
  /** Opens the Telegram bot and scans on arrival. */
  telegramUrl(chain: ChainId, address: string, bot = "AskAgentSI_bot") {
    return `https://t.me/${bot}?start=${chain}_${address}`;
  }

  private headers() {
    return { accept: "application/json", "user-agent": `${this.client} (+agentsi-sdk)`, "x-client": this.client };
  }

  private async error(res: Response) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* not json */
    }
    const msg = (body as { error?: string } | null)?.error ?? `${res.status} ${res.statusText}`;
    const ra = Number(res.headers.get("retry-after"));
    return new AgentSIError(msg, res.status, Number.isFinite(ra) && ra > 0 ? ra : undefined, body);
  }
}

/** Tier from points, the same thresholds the site uses. */
export function tierOf(points: number): { tier: ScoreTier; label: string } {
  if (points >= 85) return { tier: "fortified", label: "FORTIFIED" };
  if (points >= 65) return { tier: "solid", label: "SOLID" };
  if (points >= 45) return { tier: "watchlist", label: "WATCHLIST" };
  if (points >= 25) return { tier: "fragile", label: "FRAGILE" };
  return { tier: "hazard", label: "HAZARD" };
}

export default AgentSI;
