// Metro Studios staff API (Cloudflare Pages Function).
// Needs: KV binding STAFF, env vars DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SESSION_SECRET, OWNER_DISCORD_ID.

function slug(s) { return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); }

const DEFAULTS = {
  games: [
    { id: "westbrook-county", name: "Westbrook County" },
    { id: "project-alba", name: "Project Alba" },
    { id: "oath-of-caledonia", name: "Oath of Caledonia" }
  ],
  roles: ["Game lead", "Scripter", "Builder", "Modeller", "UI and graphics", "Marketing", "Community"].map(n => ({ id: slug(n), name: n }))
};

const enc = new TextEncoder();
// The studio TikTok account that "Sync from TikTok" reads.
const TIKTOK_USER = "metrostudiosoffical";
// Metro Studios Discord server and staff role (IDs are not secret). Env vars of the same name override these.
const GUILD_ID = "1464024797263429645";
const STAFF_ROLE_ID = "1464024797695705203";
const json = (o, status = 200, headers = {}) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });
const fail = (error, status = 400) => json({ error }, status);
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

async function sign(env, data) {
  const k = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function makeSession(env, id) {
  const p = btoa(JSON.stringify({ id, exp: Date.now() + 864e5 }));
  return p + "." + (await sign(env, p));
}
async function readSession(env, request) {
  const m = (request.headers.get("Cookie") || "").match(/ms_session=([^;]+)/);
  if (!m) return null;
  const [p, s] = m[1].split(".");
  if (!p || !s || (await sign(env, p)) !== s) return null;
  try { const d = JSON.parse(atob(p)); return d.exp > Date.now() ? d.id : null; } catch { return null; }
}
const cookie = (n, v, age) => `${n}=${v}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`;

async function getConfig(env) {
  const c = JSON.parse((await env.STAFF.get("config")) || "null") || DEFAULTS;
  return { ...c, rates: { tiktok: 0, campaign: 0, ...(c.rates || {}) } };
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// Ask TikTok for a video's title, author and thumbnail. Photo posts are retried as video links.
async function fetchOembed(clean) {
  const tries = [clean];
  if (/\/photo\//.test(clean)) tries.push(clean.replace("/photo/", "/video/"));
  for (const v of tries) {
    try {
      const r = await fetch("https://www.tiktok.com/oembed?url=" + encodeURIComponent(v), { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (r.ok) { const o = await r.json(); if (o && (o.title || o.thumbnail_url)) return o; }
    } catch {}
  }
  return null;
}

// Add a TikTok to the list (used by the manual form and the automatic ingest webhook).
async function addTikTok(env, raw, source, by, extra = {}) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return { error: "That is not a link.", status: 400 }; }
  if (!/(^|\.)tiktok\.com$/i.test(u.hostname)) return { error: "It must be a tiktok.com link.", status: 400 };
  u.search = ""; u.hash = "";
  const clean = u.toString().replace(/\/$/, "");
  const id = (clean.match(/\/(?:video|photo)\/(\d+)/) || [])[1] || slug(clean).slice(0, 80);
  if (await env.STAFF.get("tt:" + id)) return { error: "That TikTok is already on the list.", status: 409, duplicate: true };
  let title = "", author = "", thumb = "";
  const o = await fetchOembed(clean);
  if (o) { title = o.title || ""; author = o.author_name || ""; thumb = o.thumbnail_url || ""; }
  const rec = {
    id, url: clean, title: clip(extra.title || title || "TikTok", 200), author: clip(author, 60),
    thumb: /^https:\/\//.test(thumb) ? thumb : "", added: Date.now(), by, source, claim: null
  };
  await env.STAFF.put("tt:" + id, JSON.stringify(rec));
  return { rec };
}

// Ad campaigns: "dm" (a successful DM advert), "server" (a successful server advert) or "other".
const CAMP_TYPES = ["dm", "server", "other"];
const userKey = v => String(v || "").trim().replace(/^@/, "").replace(/\s+/g, "").toLowerCase().slice(0, 40);
const nameKey = v => String(v || "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 80);
// Accepts a bare code or any discord.gg / discord.com/invite link and returns just the lower-case code.
const codeKey = v => {
  const t = String(v || "").trim();
  const m = t.match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,40})/i);
  if (m) return m[1].toLowerCase();
  return /^[A-Za-z0-9-]{2,40}$/.test(t) ? t.toLowerCase() : "";
};
// Returns the earlier claim (if any) that has already logged this DM target or server. Rejected claims do not count.
async function findDuplicate(env, c) {
  if (c.type !== "dm" && c.type !== "server") return null;
  for (const x of await listAll(env, "camp:")) {
    if (x.status === "rejected" || x.type !== c.type) continue;
    if (c.type === "dm" ? (c.userKey && x.userKey === c.userKey) : ((c.code && x.code === c.code) || (c.nameKey && x.nameKey === c.nameKey))) return x;
  }
  return null;
}
const dupMsg = (x, what) => what + " has already been claimed by " + x.name + " on " + new Date(x.created).toLocaleDateString("en-GB") + (x.status === "paid" ? " (paid)" : x.status === "approved" ? " (approved)" : " (waiting for approval)") + ".";
function campTarget(body) {
  const type = CAMP_TYPES.includes(body.type) ? body.type : "other";
  const c = { type };
  if (type === "dm") { c.target = clip(body.username, 40).replace(/^@/, "").trim(); c.userKey = userKey(c.target); }
  if (type === "server") {
    c.serverName = clip(body.serverName, 80).trim(); c.nameKey = nameKey(c.serverName);
    c.invite = clip(body.invite, 120).trim(); c.code = codeKey(c.invite);
    c.target = c.serverName || c.code;
  }
  return c;
}

async function payouts(env) {
  const [tts, camps, users] = await Promise.all([listAll(env, "tt:"), listAll(env, "camp:"), listAll(env, "user:")]);
  const items = [
    ...tts.filter(t => t.claim).map(t => ({ kind: "tiktok", id: t.id, what: "TikTok: " + (t.title && t.title !== "TikTok" ? t.title : "…" + String(t.id).slice(-6)), by: t.claim.by, status: t.claim.status, amount: t.claim.amount || 0, at: t.claim.at || 0, paidAt: t.claim.paidAt || 0 })),
    ...camps.map(x => ({ kind: "campaign", id: x.id, what: "Campaign: " + x.title, by: x.by, status: x.status, amount: x.amount || 0, at: x.created || 0, paidAt: x.paidAt || 0 }))
  ];
  const claimers = new Set(items.map(i => i.by));
  return users.filter(u => u.id !== env.OWNER_DISCORD_ID && (u.roles.length || u.games.length || claimers.has(u.id))).map(u => {
    const mine = items.filter(x => x.by === u.id && x.status !== "rejected").sort((x, y) => y.at - x.at);
    const sum = st => mine.filter(x => x.status === st).reduce((n, x) => n + (x.amount || 0), 0);
    return { id: u.id, name: u.name, roblox: u.roblox || "", rates: { tiktok: u.rates?.tiktok ?? null, campaign: u.rates?.campaign ?? null }, pending: sum("pending"), owed: sum("approved"), paid: sum("paid"), lastPaid: Math.max(0, ...mine.map(x => x.paidAt || 0)), items: mine };
  });
}
async function listAll(env, prefix) {
  const out = [];
  let cursor;
  do {
    const r = await env.STAFF.list({ prefix, cursor });
    for (const k of r.keys) { const v = await env.STAFF.get(k.name); if (v) out.push(JSON.parse(v)); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}

async function handle({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = request.method;
  const [a, b, c] = path;

  if (!env.STAFF || !env.SESSION_SECRET || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.OWNER_DISCORD_ID)
    return fail("Server is not configured yet. See SETUP.md.", 500);

  // ---- Automatic TikTok ingest (called by an automation tool, not by a person) ----
  if (a === "ingest" && b === "tiktok" && method === "POST") {
    const tok = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
    if (!env.INGEST_TOKEN || !tok || (await sign(env, tok)) !== (await sign(env, env.INGEST_TOKEN))) return fail("Bad token.", 401);
    const body = await request.json().catch(() => ({}));
    const r = await addTikTok(env, body.url, "auto", "", body);
    return r.rec ? json({ ok: true }) : r.duplicate ? json({ ok: true, duplicate: true }) : fail(r.error, r.status);
  }

  // ---- Discord login flow ----
  if (a === "login") {
    const state = crypto.randomUUID();
    const q = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID, response_type: "code", scope: "identify guilds.members.read",
      redirect_uri: url.origin + "/api/callback", state, prompt: "none"
    });
    return new Response(null, { status: 302, headers: { Location: "https://discord.com/api/oauth2/authorize?" + q, "Set-Cookie": cookie("ms_state", state, 600) } });
  }
  if (a === "callback") {
    const st = (request.headers.get("Cookie") || "").match(/ms_state=([^;]+)/)?.[1];
    const code = url.searchParams.get("code");
    if (!code || !st || st !== url.searchParams.get("state")) return fail("Login failed, please try again.");
    const tr = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code",
        code, redirect_uri: url.origin + "/api/callback"
      })
    });
    if (!tr.ok) return fail("Discord rejected the login.");
    const { access_token } = await tr.json();
    const d = await (await fetch("https://discord.com/api/users/@me", { headers: { Authorization: "Bearer " + access_token } })).json();
    if (!d.id) return fail("Could not read your Discord account.");
    // Only members of the Discord server who hold a staff role may log in (the owner always can).
    if (d.id !== env.OWNER_DISCORD_ID) {
      const mr = await fetch(`https://discord.com/api/users/@me/guilds/${env.DISCORD_GUILD_ID || GUILD_ID}/member`, { headers: { Authorization: "Bearer " + access_token } });
      const member = mr.ok ? await mr.json() : null;
      const allowed = (env.DISCORD_STAFF_ROLE_ID || STAFF_ROLE_ID).split(",").map(x => x.trim()).filter(Boolean);
      if (!member || !(member.roles || []).some(r => allowed.includes(r))) {
        await env.STAFF.delete("user:" + d.id);
        return new Response(null, { status: 302, headers: { Location: "/staff/?denied=1", "Set-Cookie": cookie("ms_state", "", 0) } });
      }
    }
    const old = JSON.parse((await env.STAFF.get("user:" + d.id)) || "null") || { roles: [], games: [], joined: Date.now() };
    const user = {
      ...old, id: d.id, name: d.global_name || d.username,
      avatar: d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=64` : "", seen: Date.now()
    };
    await env.STAFF.put("user:" + d.id, JSON.stringify(user));
    const h = new Headers({ Location: "/staff/" });
    h.append("Set-Cookie", cookie("ms_session", await makeSession(env, d.id), 86400));
    h.append("Set-Cookie", cookie("ms_state", "", 0));
    return new Response(null, { status: 302, headers: h });
  }
  if (a === "logout") {
    return new Response(null, { status: 302, headers: { Location: "/staff/", "Set-Cookie": cookie("ms_session", "", 0) } });
  }

  // ---- Everything below needs a session ----
  const uid = await readSession(env, request);
  if (!uid) return fail("Not logged in.", 401);
  if (method !== "GET") {
    const o = request.headers.get("Origin");
    if (o && o !== url.origin) return fail("Bad origin.", 403);
  }
  const me = JSON.parse((await env.STAFF.get("user:" + uid)) || "null");
  if (!me) return fail("Not logged in.", 401);
  const owner = uid === env.OWNER_DISCORD_ID;
  const cfg = await getConfig(env);
  const myGames = owner ? cfg.games.map(g => g.id) : me.games.filter(g => cfg.games.some(x => x.id === g));
  const myRoles = me.roles.filter(r => cfg.roles.some(x => x.id === r));
  const lead = !owner && myRoles.includes("game-lead");
  const marketing = owner || myRoles.includes("marketing");
  const rateFor = (u, k) => (Number.isFinite(u.rates?.[k]) ? u.rates[k] : cfg.rates[k] || 0);
  const int = v => { if (v === "" || v == null) return null; const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 1e7 ? n : null; };
  // Owner decisions on a payment claim: approve, mark paid, reject, or just change the amount.
  const decide = (o, body) => {
    const amt = int(body.amount);
    if (amt !== null) o.amount = amt;
    const act = body.action;
    if (act === "approve" && o.status === "pending") o.status = "approved";
    else if (act === "reopen" && o.status === "paid") { o.status = "approved"; delete o.paidAt; }
    else if (act === "paid" && o.status === "approved") { o.status = "paid"; o.paidAt = Date.now(); }
    else if (act === "reject" && o.status !== "paid") return "reject";
    else if (act !== "amount") return "invalid";
    return "ok";
  };
  const access = owner || myGames.length > 0 || myRoles.length > 0;
  const body = method === "GET" || method === "DELETE" ? {} : await request.json().catch(() => ({}));
  const visible = x => !x.game || myGames.includes(x.game);

  if (a === "me") {
    return json({ user: { id: me.id, name: me.name, avatar: me.avatar, owner, lead, marketing, roblox: me.roblox || "", rates: { tiktok: rateFor(me, "tiktok"), campaign: rateFor(me, "campaign") }, access, games: myGames, roles: myRoles }, config: cfg });
  }
  if (!access) return fail("Waiting for the owner to give you access.", 403);

  if (a === "data" && method === "GET") {
    const [items, announcements, links, users] = await Promise.all([listAll(env, "item:"), listAll(env, "ann:"), listAll(env, "link:"), listAll(env, "user:")]);
    const names = Object.fromEntries(users.map(u => [u.id, u.name]));
    return json({
      items: items.filter(visible).sort((x, y) => y.created - x.created),
      announcements: announcements.filter(visible).sort((x, y) => y.created - x.created).slice(0, 30),
      links: links.filter(visible),
      people: users.filter(u => u.id === env.OWNER_DISCORD_ID || u.games.length || u.roles.length).map(u => ({ id: u.id, name: u.name, games: u.id === env.OWNER_DISCORD_ID ? cfg.games.map(g => g.id) : u.games, roles: u.roles })),
      names
    });
  }

  // Tasks and bug reports (any staff member, for their own games)
  if (a === "items") {
    if (method === "POST") {
      if (!myGames.includes(body.game)) return fail("Pick one of your games.");
      const title = clip(body.title, 120);
      if (!title) return fail("Add a title.");
      const it = {
        id: crypto.randomUUID(), type: body.type === "bug" ? "bug" : "task", title, notes: clip(body.notes, 1000),
        game: body.game, priority: ["low", "med", "high"].includes(body.priority) ? body.priority : "med",
        status: "todo", assignee: clip(body.assignee, 40), by: uid, created: Date.now()
      };
      await env.STAFF.put("item:" + it.id, JSON.stringify(it));
      return json(it);
    }
    const it = JSON.parse((await env.STAFF.get("item:" + b)) || "null");
    if (!it || !visible(it)) return fail("Not found.", 404);
    if (method === "PATCH") {
      if (["todo", "doing", "done"].includes(body.status)) it.status = body.status;
      if ("assignee" in body) it.assignee = clip(body.assignee, 40);
      await env.STAFF.put("item:" + it.id, JSON.stringify(it));
      return json(it);
    }
    if (method === "DELETE") {
      if (!owner && it.by !== uid) return fail("Only the creator or the owner can delete this.", 403);
      await env.STAFF.delete("item:" + it.id);
      return json({ ok: true });
    }
  }

  // ---- Profile ----
  if (a === "profile" && method === "PUT") {
    const r = clip(body.roblox, 20);
    if (r && !/^[A-Za-z0-9_]{3,20}$/.test(r)) return fail("That is not a valid Roblox username.");
    me.roblox = r;
    await env.STAFF.put("user:" + uid, JSON.stringify(me));
    return json({ roblox: r });
  }

  // ---- TikToks: any staff member can claim one they made ----
  if (a === "tiktoks") {
    if (method === "GET") {
      const all = (await listAll(env, "tt:")).sort((x, y) => y.added - x.added)
        .map(t => (t.claim && !owner && t.claim.by !== uid ? { ...t, claim: { ...t.claim, amount: undefined } } : t));
      return json({ tiktoks: all });
    }
    if (method === "POST" && !b) {
      if (!(owner || marketing || lead)) return fail("Only marketing staff, leads or the owner can add TikToks.", 403);
      const r = await addTikTok(env, body.url, "manual", uid);
      return r.rec ? json(r.rec) : fail(r.error, r.status);
    }
    // Best-effort backfill: read the public TikTok profile page and return the video links it exposes.
    // TikTok does not offer a free list of all videos, so this can miss older ones; the staff page then
    // adds each link one at a time (and anything missed can be pasted in by hand).
    if (b === "discover" && method === "POST") {
      if (!(owner || marketing || lead)) return fail("Only marketing staff, leads or the owner can sync TikToks.", 403);
      const user = TIKTOK_USER;
      let html = "";
      try {
        const r = await fetch("https://www.tiktok.com/@" + user, { headers: { "User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9" } });
        html = await r.text();
      } catch { return fail("Could not reach TikTok.", 502); }
      const ids = new Set();
      for (const m of html.matchAll(/\/(?:video|photo)\/(\d{15,22})/g)) ids.add(m[1]);
      for (const m of html.matchAll(/"(?:itemId|awemeId)":"(\d{15,22})"/g)) ids.add(m[1]);
      const urls = [...ids].map(id => "https://www.tiktok.com/@" + user + "/video/" + id);
      return json({ urls, user });
    }
    // Owner: set the Robux amount on every claim that is still waiting for approval.
    if (b === "setamount" && method === "POST") {
      if (!owner) return fail("Owner only.", 403);
      const n = int(body.amount);
      if (n === null) return fail("Enter a number of Robux.");
      let count = 0;
      for (const x of await listAll(env, "tt:")) if (x.claim && x.claim.status === "pending") { x.claim.amount = n; await env.STAFF.put("tt:" + x.id, JSON.stringify(x)); count++; }
      return json({ ok: true, count });
    }
    const t = JSON.parse((await env.STAFF.get("tt:" + b)) || "null");
    if (!t) return fail("Not found.", 404);
    const save = async () => { await env.STAFF.put("tt:" + t.id, JSON.stringify(t)); return json(t); };
    if (c === "refresh" && method === "POST") {
      if (!(owner || marketing || lead)) return fail("Not allowed.", 403);
      const o = await fetchOembed(t.url);
      if (o) { if (o.title) t.title = clip(o.title, 200); if (o.author_name) t.author = clip(o.author_name, 60); if (/^https:\/\//.test(o.thumbnail_url || "")) t.thumb = o.thumbnail_url; }
      return save();
    }
    // Staff browsers can fetch TikTok's preview themselves and hand it back (TikTok often blocks the server).
    if (c === "details" && method === "POST") {
      if (!(owner || marketing || lead)) return fail("Not allowed.", 403);
      if (body.title) t.title = clip(body.title, 200);
      if (body.author) t.author = clip(body.author, 60);
      if (/^https:\/\/[^\s]{1,1500}$/.test(String(body.thumb || ""))) t.thumb = body.thumb;
      return save();
    }
    if (c === "claim" && method === "POST") {
      if (!marketing) return fail("Only marketing staff can claim TikToks.", 403);
      if (t.claim) return fail("Already claimed by " + t.claim.name + ".");
      t.claim = { by: uid, name: me.name, at: Date.now(), amount: rateFor(me, "tiktok"), status: "pending" };
      return save();
    }
    if (c === "claim" && method === "DELETE") {
      if (!t.claim || t.claim.by !== uid || t.claim.status !== "pending") return fail("You can only withdraw your own pending claim.", 403);
      t.claim = null;
      return save();
    }
    if (!owner) return fail("Owner only.", 403);
    if (method === "DELETE") { await env.STAFF.delete("tt:" + t.id); return json({ ok: true }); }
    if (method === "PATCH" && body.action === "reset") { t.claim = null; return save(); }
    if (method === "PATCH") {
      if (!t.claim) return fail("Nobody has claimed this yet.");
      const r = decide(t.claim, body);
      if (r === "invalid") return fail("That action does not apply right now.");
      if (r === "reject") t.claim = null;
      return save();
    }
  }

  // ---- Marketing campaign claims with proof ----
  if (a === "campaigns") {
    if (method === "GET") {
      const all = (await listAll(env, "camp:")).filter(x => owner || x.by === uid).sort((x, y) => y.created - x.created);
      return json({ campaigns: all });
    }
    // Staff can check whether a DM target or server has already been claimed before they spend time on it.
    if (b === "check" && method === "POST") {
      if (!marketing) return fail("Only marketing staff can claim campaigns.", 403);
      const t = campTarget(body);
      const d = await findDuplicate(env, t);
      return json({ duplicate: !!d, message: d ? dupMsg(d, t.type === "dm" ? "@" + t.target : t.target || "That server") : "" });
    }
    if (method === "POST") {
      if (!marketing) return fail("Only marketing staff can claim campaigns.", 403);
      const t = campTarget(body);
      if (t.type === "dm" && !t.userKey) return fail("Enter the username you sent the DM advert to.");
      if (t.type === "server" && !t.nameKey && !t.code) return fail("Enter the server name and/or its invite code or link.");
      if (t.invite && !t.code) return fail("That does not look like a Discord invite. Use the code (e.g. abc123) or a discord.gg link.");
      const dup = await findDuplicate(env, t);
      if (dup) return fail(dupMsg(dup, t.type === "dm" ? "@" + t.target : t.target), 409);
      const title = t.type === "dm" ? "DM advert: " + t.target : t.type === "server" ? "Server advert: " + t.target : clip(body.title, 120);
      if (!title) return fail("Add a title.");
      const links = (Array.isArray(body.links) ? body.links : []).map(l => clip(l, 500)).filter(l => /^https?:\/\//i.test(l)).slice(0, 5);
      const imgs = (Array.isArray(body.proofs) ? body.proofs : []).slice(0, 4);
      for (const d of imgs) {
        if (typeof d !== "string" || d.length > 900000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d)) return fail("Proof images must be JPG, PNG or WebP.");
      }
      if (!links.length && !imgs.length) return fail("Attach proof: at least one screenshot or link.");
      const proofs = [];
      for (const d of imgs) { const pid = crypto.randomUUID(); await env.STAFF.put("proof:" + pid, JSON.stringify({ by: uid, data: d })); proofs.push(pid); }
      const rec = { id: crypto.randomUUID(), by: uid, name: me.name, title, description: clip(body.description, 2000), links, proofs, amount: rateFor(me, "campaign"), status: "pending", note: "", created: Date.now(), ...t };
      await env.STAFF.put("camp:" + rec.id, JSON.stringify(rec));
      return json(rec);
    }
    const rec = JSON.parse((await env.STAFF.get("camp:" + b)) || "null");
    if (!rec || (!owner && rec.by !== uid)) return fail("Not found.", 404);
    if (method === "DELETE") {
      if (!owner && !["pending", "rejected"].includes(rec.status)) return fail("Approved claims cannot be deleted.", 403);
      for (const pid of rec.proofs) await env.STAFF.delete("proof:" + pid);
      await env.STAFF.delete("camp:" + rec.id);
      return json({ ok: true });
    }
    if (method === "PATCH") {
      if (!owner) return fail("Owner only.", 403);
      const r = decide(rec, body);
      if (r === "invalid") return fail("That action does not apply right now.");
      if (r === "reject") rec.status = "rejected";
      if ("note" in body) rec.note = clip(body.note, 300);
      await env.STAFF.put("camp:" + rec.id, JSON.stringify(rec));
      return json(rec);
    }
  }
  if (a === "proof" && method === "GET") {
    const p = JSON.parse((await env.STAFF.get("proof:" + b)) || "null");
    if (!p || (!owner && p.by !== uid)) return fail("Not found.", 404);
    const m = p.data.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    return new Response(Uint8Array.from(atob(m[2]), ch => ch.charCodeAt(0)), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=3600" } });
  }

  // ---- Payments (owner) ----
  if (a === "payouts") {
    if (!owner) return fail("Owner only.", 403);
    if (method === "POST" && body.action === "approve") {
      for (const t of await listAll(env, "tt:")) if (t.claim && t.claim.by === body.user && t.claim.status === "pending") { t.claim.status = "approved"; await env.STAFF.put("tt:" + t.id, JSON.stringify(t)); }
      for (const x of await listAll(env, "camp:")) if (x.by === body.user && x.status === "pending") { x.status = "approved"; await env.STAFF.put("camp:" + x.id, JSON.stringify(x)); }
    } else if (method === "POST") {
      for (const t of await listAll(env, "tt:")) if (t.claim && t.claim.by === body.user && t.claim.status === "approved") { t.claim.status = "paid"; t.claim.paidAt = Date.now(); await env.STAFF.put("tt:" + t.id, JSON.stringify(t)); }
      for (const x of await listAll(env, "camp:")) if (x.by === body.user && x.status === "approved") { x.status = "paid"; x.paidAt = Date.now(); await env.STAFF.put("camp:" + x.id, JSON.stringify(x)); }
    }
    return json({ people: await payouts(env) });
  }
  if (a === "rates" && method === "PUT") {
    if (!owner) return fail("Owner only.", 403);
    if (body.user) {
      const u = JSON.parse((await env.STAFF.get("user:" + body.user)) || "null");
      if (!u) return fail("No such user.", 404);
      u.rates = {};
      for (const k of ["tiktok", "campaign"]) { const n = int(body[k]); if (n !== null) u.rates[k] = n; }
      await env.STAFF.put("user:" + u.id, JSON.stringify(u));
      return json({ ok: true });
    }
    cfg.rates = { tiktok: int(body.tiktok) ?? 0, campaign: int(body.campaign) ?? 0 };
    await env.STAFF.put("config", JSON.stringify(cfg));
    return json(cfg);
  }

  // ---- Owner only from here ----
  if (!["announcements", "links", "games", "roles", "users"].includes(a)) return fail("Not found.", 404);
  if (!owner && !(lead && ["announcements", "links", "users"].includes(a))) return fail("Owner or game lead only.", 403);

  if (a === "announcements" || a === "links") {
    const pre = a === "announcements" ? "ann:" : "link:";
    if (method === "POST") {
      const game = body.game && cfg.games.some(g => g.id === body.game) ? body.game : "";
      if (!owner && !myGames.includes(game)) return fail("Pick one of your games.");
      const title = clip(body.title, 120);
      if (!title) return fail("Add a title.");
      const rec = { id: crypto.randomUUID(), title, game, created: Date.now() };
      if (a === "announcements") rec.text = clip(body.text, 2000);
      else {
        if (!/^https?:\/\//i.test(body.url || "")) return fail("Link must start with http:// or https://");
        rec.url = clip(body.url, 500);
      }
      await env.STAFF.put(pre + rec.id, JSON.stringify(rec));
      return json(rec);
    }
    if (method === "DELETE") {
      const rec = JSON.parse((await env.STAFF.get(pre + b)) || "null");
      if (rec && !owner && !myGames.includes(rec.game)) return fail("That belongs to another game.", 403);
      await env.STAFF.delete(pre + b);
      return json({ ok: true });
    }
  }

  if (a === "games" || a === "roles") {
    if (method === "POST") {
      const name = clip(body.name, 40), id = slug(name);
      if (!id) return fail("Add a name.");
      if (cfg[a].some(x => x.id === id)) return fail("That already exists.");
      cfg[a].push({ id, name });
      await env.STAFF.put("config", JSON.stringify(cfg));
      return json(cfg);
    }
    if (method === "DELETE") {
      cfg[a] = cfg[a].filter(x => x.id !== b);
      await env.STAFF.put("config", JSON.stringify(cfg));
      const field = a === "games" ? "games" : "roles";
      for (const u of await listAll(env, "user:")) {
        if (u[field].includes(b)) { u[field] = u[field].filter(x => x !== b); await env.STAFF.put("user:" + u.id, JSON.stringify(u)); }
      }
      if (a === "games") {
        for (const p of ["item:", "ann:", "link:"]) for (const r of await listAll(env, p)) if (r.game === b) await env.STAFF.delete(p + r.id);
      }
      return json(cfg);
    }
  }

  if (a === "users") {
    // Owner: full control. Game lead: can add/remove people from the games they lead, and set non-lead roles.
    const strip = u => ({ id: u.id, name: u.name, avatar: u.avatar, seen: u.seen, games: u.games, roles: u.roles });
    if (method === "GET") {
      const all = (await listAll(env, "user:")).filter(u => owner || (u.id !== env.OWNER_DISCORD_ID && !u.roles.includes("game-lead")));
      return json({ users: all.sort((x, y) => y.seen - x.seen).map(strip) });
    }
    if (method === "PUT") {
      const u = JSON.parse((await env.STAFF.get("user:" + b)) || "null");
      if (!u) return fail("No such user.", 404);
      const wantG = (body.games || []).filter(g => cfg.games.some(x => x.id === g));
      const wantR = (body.roles || []).filter(r => cfg.roles.some(x => x.id === r));
      if (owner) { u.games = wantG; u.roles = wantR; }
      else {
        if (b === env.OWNER_DISCORD_ID || u.roles.includes("game-lead")) return fail("Only the owner can change this person.", 403);
        u.games = [...u.games.filter(g => !myGames.includes(g)), ...wantG.filter(g => myGames.includes(g))];
        u.roles = wantR.filter(r => r !== "game-lead");
      }
      await env.STAFF.put("user:" + u.id, JSON.stringify(u));
      return json(strip(u));
    }
    if (method === "DELETE") {
      if (!owner) return fail("Owner only.", 403);
      if (b === uid) return fail("You cannot remove yourself.");
      await env.STAFF.delete("user:" + b);
      return json({ ok: true });
    }
  }
  return fail("Not found.", 404);
}

// Any unexpected failure comes back as readable JSON instead of a blank error page.
export async function onRequest(ctx) {
  try {
    return await handle(ctx);
  } catch (e) {
    return json({ error: "Server error: " + String((e && e.message) || e).slice(0, 300) }, 500);
  }
}
