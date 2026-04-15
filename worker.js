// Cloudflare Worker — CORS proxy for OKX / Bybit / Coinbase / Binance (fapi + bapi)
// Deploy: paste this code into a Cloudflare Worker (Hello World template)

const ROUTES = {
  '/okx/': ['https://www.okx.com/api/v5/'],
  '/bybit/': ['https://api.bybit.com/v5/'],
  '/coinbase/': ['https://api.exchange.coinbase.com/'],
  // Binance fapi may intermittently block specific PoPs/IPs; rotate across official hosts.
  '/binance-fapi/': [
    'https://fapi.binance.com/',
    'https://fapi1.binance.com/',
    'https://fapi2.binance.com/',
    'https://fapi3.binance.com/',
  ],
  '/binance-bapi/': ['https://www.binance.com/bapi/'],
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildHeaders(prefix) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
  if (prefix.startsWith('/binance-')) {
    headers['Origin'] = 'https://www.binance.com';
    headers['Referer'] = 'https://www.binance.com/';
  }
  return headers;
}

async function proxyToTargets(prefix, targets, apiPath, search) {
  const headers = buildHeaders(prefix);
  let lastResp = null;
  let lastTarget = null;
  let lastErr = null;

  for (const target of targets) {
    const apiUrl = target + apiPath + search;
    try {
      const resp = await fetch(apiUrl, { headers });
      lastResp = resp;
      lastTarget = target;

      // Try next upstream when likely blocked/rate-limited/transient.
      const shouldRetryTarget = resp.status === 403 || resp.status === 451 || resp.status === 429 || resp.status >= 500;
      if (shouldRetryTarget && target !== targets[targets.length - 1]) continue;

      const body = await resp.arrayBuffer();
      return new Response(body, {
        status: resp.status,
        headers: {
          'Content-Type': resp.headers.get('Content-Type') || 'application/json',
          'X-Upstream-Target': lastTarget,
          ...CORS_HEADERS,
        },
      });
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  if (lastResp) {
    const body = await lastResp.arrayBuffer();
    return new Response(body, {
      status: lastResp.status,
      headers: {
        'Content-Type': lastResp.headers.get('Content-Type') || 'application/json',
        'X-Upstream-Target': lastTarget || '',
        ...CORS_HEADERS,
      },
    });
  }

  return new Response(JSON.stringify({ error: 'Upstream request failed', detail: String(lastErr || 'unknown error') }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Find matching route
    for (const [prefix, targets] of Object.entries(ROUTES)) {
      if (path.startsWith(prefix)) {
        const apiPath = path.slice(prefix.length);
        return proxyToTargets(prefix, targets, apiPath, url.search);
      }
    }

    return new Response(JSON.stringify({ error: 'Not found. Use /okx/, /bybit/, /coinbase/, /binance-fapi/, or /binance-bapi/' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
