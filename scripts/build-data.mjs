// Builds data.json from PUBLIC innergclaw repos only.
import fs from "node:fs";
const H = { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json" };
const get = async u => { const r = await fetch("https://api.github.com" + u, { headers: H }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const et = s => new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" }) + " ET";
const repos = new Set();
for (let p = 1; p < 10; p++) { const a = await get(`/users/innergclaw/repos?type=owner&per_page=100&page=${p}`); a.filter(r => !r.private && r.visibility === "public").forEach(r => repos.add(r.name)); if (a.length < 100) break; }
const search = async q => (await get(`/search/issues?q=${encodeURIComponent(q)}&per_page=100&sort=updated`)).items;
const repoOf = i => i.repository_url.split("/").pop();
// Redact private repo names from titles. PRIVATE_REPOS is a repo secret (comma list).
const priv = (process.env.PRIVATE_REPOS || "").split(",").map(s => s.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
const redact = t => { t = t.replace(/innergclaw\/([\w.-]+)/g, (m, n) => repos.has(n) ? m : "a private repo"); for (const n of priv) t = t.replace(new RegExp(`\\b${n.replace(/[.-]/g, "\\$&")}\\b`, "g"), "a private repo"); return t; };
const map = (i, k) => ({ repo: repoOf(i), n: i.number, t: redact(i.title).replace(/\u2014/g, "~"), u: i.html_url, d: et(i[k]) });
const open = (await search("is:pr is:open user:innergclaw is:public")).filter(i => repos.has(repoOf(i))).slice(0, 50).map(i => map(i, "created_at"));
const merged = (await search("is:pr is:merged user:innergclaw is:public")).filter(i => repos.has(repoOf(i))).slice(0, 10).map(i => map(i, "closed_at"));
const bots = JSON.parse(fs.readFileSync("bots.json", "utf8"));
fs.writeFileSync("data.json", JSON.stringify({ refreshed: et(Date.now()), open, merged, bots }, null, 1) + "\n");
console.log(`open ${open.length} merged ${merged.length}`);
