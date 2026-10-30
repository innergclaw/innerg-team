// Relay for InnerG Team job dispatch. Holds the webhook URL and key as function secrets.
// Only the owner account (by Supabase Auth user id and email) may send.
const ORIGIN = "https://innergclaw.github.io";
const OWNER_ID = Deno.env.get("DISPATCH_OWNER_ID") ?? "";
const OWNER_EMAIL = (Deno.env.get("DISPATCH_OWNER_EMAIL") ?? "").toLowerCase();
const BOTS = new Set(["MARROW","Content","InnerG Studio","Video Editor","Market Pulse","Trading Lab","Niche Lab","The Final Frequency Editor","SOC Coach","Health Check","dr eggbot"]);
const LIM: Record<string, number> = { goal: 500, inputs: 2000, done_when: 1000 };
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
const json = (code: number, obj: unknown) => new Response(JSON.stringify(obj), { status: code, headers: { ...cors, "Content-Type": "application/json" } });

function validate(b: any) {
  if (b?.action === "ping") return { action: "ping" };
  if (b?.action !== "send_job") return "action must be send_job or ping";
  if (!BOTS.has(b.bot)) return "unknown bot";
  if (!["low", "medium", "high"].includes(b.risk)) return "risk must be low, medium or high";
  for (const [k, n] of Object.entries(LIM)) {
    if (typeof b[k] !== "string") return `${k} required`;
    if (b[k].length > n) return `${k} too long (max ${n})`;
  }
  if (!b.goal.trim() || !b.done_when.trim()) return "goal and done_when required";
  return { action: "send_job", bot: b.bot, goal: b.goal, inputs: b.inputs, done_when: b.done_when, risk: b.risk };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "POST only" });
  const origin = req.headers.get("origin");
  if (origin && origin !== ORIGIN) return json(403, { ok: false, error: "origin not allowed" });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !OWNER_ID) return json(401, { ok: false, error: "sign in required" });
  const u = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" } });
  if (!u.ok) return json(401, { ok: false, error: "sign in required" });
  const user = await u.json();
  if (user.id !== OWNER_ID || String(user.email ?? "").toLowerCase() !== OWNER_EMAIL) return json(403, { ok: false, error: "not allowed" });
  const raw = await req.text();
  if (raw.length > 10000) return json(413, { ok: false, error: "too large" });
  let b; try { b = JSON.parse(raw); } catch { return json(400, { ok: false, error: "bad JSON" }); }
  const v = validate(b); if (typeof v === "string") return json(400, { ok: false, error: v });
  const KEY = Deno.env.get("DISPATCH_WEBHOOK_KEY") ?? "";
  try {
    const r = await fetch(Deno.env.get("DISPATCH_WEBHOOK_URL") ?? "", { method: "POST", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, "X-Automation-Key": KEY }, body: JSON.stringify(v) });
    return json(r.ok ? 200 : 502, { ok: r.ok, upstream: r.status });
  } catch { return json(502, { ok: false, error: "upstream unreachable" }); }
});
