/**
 * SolarCurve solar data API — Cloudflare Worker
 *
 * Bridges the static site to Tesla Fleet API:
 *   GET /api/solar           → cached live production JSON for the widget
 *   GET /api/tesla/login     → redirects to Tesla's OAuth consent page (one-time setup)
 *   GET /api/tesla/callback  → OAuth code exchange; stores tokens + site id in KV
 *   GET /api/tesla/status    → setup sanity check (no secrets exposed)
 *
 * Tesla refresh tokens are single-use: every refresh returns a new one, which
 * is persisted to KV immediately. Access tokens last ~8h and are reused until
 * 5 minutes before expiry. /api/solar responses are cached in KV for CACHE_TTL
 * seconds so upstream calls stay bounded no matter the traffic.
 */

const AUTH_URL = 'https://auth.tesla.com/oauth2/v3/authorize';
const TOKEN_URL = 'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token';
const API_BASE = 'https://fleet-api.prd.na.vn.cloud.tesla.com';
const REDIRECT_URI = 'https://www.solarcurve.com/api/tesla/callback';
const SCOPES = 'openid offline_access energy_device_data';
const CACHE_TTL = 120; // seconds between upstream Tesla calls

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://www.solarcurve.com',
  'Cache-Control': `public, max-age=${CACHE_TTL}`,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Setup/debug endpoints require ?key=<SETUP_KEY worker secret>. The OAuth
    // callback is instead gated by its single-use state (issued only via a
    // keyed /login), so a drive-by visitor can't overwrite the stored tokens.
    const authed = Boolean(env.SETUP_KEY) && url.searchParams.get('key') === env.SETUP_KEY;
    try {
      switch (url.pathname) {
        case '/api/solar':          return await solarData(env, url.searchParams.has('raw') && authed);
        case '/api/tesla/login':    return authed ? await login(env) : notFound();
        case '/api/tesla/callback': return await callback(url, env);
        case '/api/tesla/status':   return authed ? await status(env) : notFound();
        default:
          return notFound();
      }
    } catch (err) {
      // Upstream error detail (statuses, response bodies) stays in the logs —
      // the public response is generic.
      console.error(`[solar-api] ${url.pathname}: ${err.message}`);
      return new Response(JSON.stringify({ error: 'upstream error' }), { status: 502, headers: JSON_HEADERS });
    }
  },
};

function notFound() {
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: JSON_HEADERS });
}

// ── OAuth setup flow ─────────────────────────────────────────────────────────

async function login(env) {
  const state = crypto.randomUUID();
  await env.TESLA.put('oauth_state', state, { expirationTtl: 600 });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.TESLA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return Response.redirect(`${AUTH_URL}?${params}`, 302);
}

async function callback(url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = await env.TESLA.get('oauth_state');
  if (!code) return htmlPage('Missing ?code — start again at /api/tesla/login', false);
  if (!savedState || state !== savedState) return htmlPage('State mismatch — start again at /api/tesla/login', false);
  await env.TESLA.delete('oauth_state');

  const tokens = await tokenRequest(env, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });
  await saveTokens(env, tokens);

  // Discover the energy site id once and store it.
  const products = await teslaGet(env, '/api/1/products', tokens.access_token);
  const site = (products.response ?? []).find(p => p.energy_site_id);
  if (!site) return htmlPage('Authorized, but no energy site found on this Tesla account.', false);
  await env.TESLA.put('site_id', String(site.energy_site_id));

  return htmlPage(`Connected! Energy site ${site.energy_site_id} (${site.site_name ?? 'unnamed'}) is linked. The widget can now go live.`, true);
}

async function status(env) {
  const tokens = await env.TESLA.get('tokens', 'json');
  const siteId = await env.TESLA.get('site_id');
  return new Response(JSON.stringify({
    authorized: Boolean(tokens?.refresh_token),
    access_token_expires_at: tokens?.expires_at ?? null,
    site_id: siteId ?? null,
  }), { headers: JSON_HEADERS });
}

// ── Token management ─────────────────────────────────────────────────────────

async function tokenRequest(env, params) {
  const body = new URLSearchParams({
    client_id: env.TESLA_CLIENT_ID,
    client_secret: env.TESLA_CLIENT_SECRET,
    audience: API_BASE,
    ...params,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function saveTokens(env, tokens) {
  await env.TESLA.put('tokens', JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (tokens.expires_in ?? 28800) * 1000,
  }));
}

async function getAccessToken(env) {
  const tokens = await env.TESLA.get('tokens', 'json');
  if (!tokens?.refresh_token) throw new Error('not authorized — visit /api/tesla/login');
  if (Date.now() < tokens.expires_at - 5 * 60 * 1000) return tokens.access_token;

  const fresh = await tokenRequest(env, {
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });
  await saveTokens(env, fresh); // persists the rotated single-use refresh token
  return fresh.access_token;
}

// ── Solar data ───────────────────────────────────────────────────────────────

async function solarData(env, raw = false) {
  const cached = await env.TESLA.get('cache:solar', 'json');
  if (!raw && cached && Date.now() - cached.fetched_at < CACHE_TTL * 1000) {
    return new Response(JSON.stringify(cached), { headers: JSON_HEADERS });
  }

  try {
    return await fetchFreshSolarData(env, raw);
  } catch (err) {
    // Serve stale cache (up to its 1h KV lifetime) rather than dashes when
    // Tesla has a hiccup.
    if (!raw && cached) {
      console.warn(`[solar-api] serving stale cache after upstream failure: ${err.message}`);
      return new Response(JSON.stringify({ ...cached, stale: true }), { headers: JSON_HEADERS });
    }
    throw err;
  }
}

async function fetchFreshSolarData(env, raw) {
  const siteId = await env.TESLA.get('site_id');
  if (!siteId) throw new Error('no site id — visit /api/tesla/login');
  const token = await getAccessToken(env);

  const live = (await teslaGet(env, `/api/1/energy_sites/${siteId}/live_status`, token)).response ?? {};

  // Today's totals are best-effort — live payload is the priority.
  let today = null;
  try {
    const tz = 'America/Chicago';
    const end = new Date().toISOString();
    const hist = (await teslaGet(
      env,
      `/api/1/energy_sites/${siteId}/calendar_history?kind=energy&period=day&end_date=${encodeURIComponent(end)}&time_zone=${encodeURIComponent(tz)}`,
      token
    )).response;
    if (raw) {
      return new Response(JSON.stringify(hist, null, 2), { headers: JSON_HEADERS });
    }
    // period=day returns 5-minute buckets (Wh) for the current day — sum them.
    // Note: this site meters solar production only (no consumption CTs yet),
    // so load/export fields from Tesla are not meaningful.
    const buckets = hist?.time_series;
    if (buckets?.length) {
      const wh = buckets.map(b => b.solar_energy_exported ?? 0);
      today = {
        solar_kwh: round1(wh.reduce((t, v) => t + v, 0) / 1000),
        peak_kw: round1(Math.max(...wh) * 12 / 1000), // Wh per 5-min bucket → avg kW in that bucket
      };
    }
  } catch (err) {
    console.warn(`[solar-api] calendar_history failed (non-fatal): ${err.message}`);
  }

  const payload = {
    fetched_at: Date.now(),
    solar_power_w: live.solar_power ?? 0,
    load_power_w: live.load_power ?? 0,
    grid_power_w: live.grid_power ?? 0,
    battery_power_w: live.battery_power ?? 0,
    today,
  };
  await env.TESLA.put('cache:solar', JSON.stringify(payload), { expirationTtl: 3600 });
  return new Response(JSON.stringify(payload), { headers: JSON_HEADERS });
}

async function teslaGet(env, path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Tesla API ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const round1 = n => Math.round(n * 10) / 10;

function htmlPage(message, ok) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>SolarCurve · Tesla setup</title></head>
     <body style="background:#0d1117;color:#e6edf3;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh">
       <div style="max-width:420px;text-align:center">
         <p style="font-size:40px;margin:0 0 12px">${ok ? '☀️' : '⚠️'}</p>
         <p>${message}</p>
       </div>
     </body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
