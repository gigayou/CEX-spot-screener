// Cloudflare Worker — CORS proxy for OKX / Bybit / Coinbase
// Deploy: paste this code into a Cloudflare Worker (Hello World template)

const ROUTES = {
  '/okx/':      'https://www.okx.com/api/v5/',
  '/bybit/':    'https://api.bybit.com/v5/',
  '/coinbase/': 'https://api.exchange.coinbase.com/',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Find matching route
    for (const [prefix, target] of Object.entries(ROUTES)) {
      if (path.startsWith(prefix)) {
        const apiPath = path.slice(prefix.length);
        const apiUrl = target + apiPath + url.search;

        const resp = await fetch(apiUrl, {
          headers: { 'User-Agent': 'CEX-Screener/1.0' },
        });

        const body = await resp.arrayBuffer();
        return new Response(body, {
          status: resp.status,
          headers: {
            'Content-Type': resp.headers.get('Content-Type') || 'application/json',
            ...CORS_HEADERS,
          },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found. Use /okx/, /bybit/, or /coinbase/' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
