// UGC Studio — Cloudflare Worker proxy
// Guarda las API keys (fal.ai y Anthropic) fuera del navegador.
// Secrets: FAL_KEY, ANTHROPIC_KEY, APP_TOKEN   ·  Var opcional: CLAUDE_MODEL, ALLOWED_ORIGIN

const ALLOWED_FAL = [
  'fal-ai/veo3.1/lite/image-to-video',
  'fal-ai/nano-banana-2/edit',
];

export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-App-Token',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.headers.get('X-App-Token') !== env.APP_TOKEN) return json({ error: 'token inválido' }, 401);

    const url = new URL(req.url);
    try {
      if (url.pathname === '/ping') return json({ ok: true });

      // 1) Guion con Claude
      if (url.pathname === '/script' && req.method === 'POST') {
        const body = await req.json();
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': env.ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: env.CLAUDE_MODEL || 'claude-sonnet-4-5',
            max_tokens: 1500,
            system: body.system,
            messages: [{ role: 'user', content: body.prompt }],
          }),
        });
        const data = await r.json();
        if (!r.ok) return json({ error: data.error?.message || 'error Claude' }, r.status);
        return json({ text: data.content?.map(c => c.text || '').join('') });
      }

      // 2) Encolar trabajo en fal
      if (url.pathname === '/fal/submit' && req.method === 'POST') {
        const { endpoint, input } = await req.json();
        if (!ALLOWED_FAL.includes(endpoint)) return json({ error: 'endpoint no permitido' }, 400);
        const r = await fetch(`https://queue.fal.run/${endpoint}`, {
          method: 'POST',
          headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await r.json();
        return json(data, r.status);
      }

      // 3) Consultar estado / resultado (status_url o response_url que devolvió fal)
      if (url.pathname === '/fal/get' && req.method === 'GET') {
        const target = url.searchParams.get('u');
        if (!target || new URL(target).hostname !== 'queue.fal.run') return json({ error: 'url inválida' }, 400);
        const r = await fetch(target, { headers: { Authorization: `Key ${env.FAL_KEY}` } });
        const data = await r.json();
        return json(data, r.status);
      }

      // 4) Proxy de medios (para poder dibujar los videos en canvas sin problemas de CORS)
      if (url.pathname === '/media' && req.method === 'GET') {
        const target = url.searchParams.get('u');
        const host = target ? new URL(target).hostname : '';
        if (!/(^|\.)fal\.media$|(^|\.)fal\.run$|storage\.googleapis\.com$/.test(host)) return json({ error: 'host no permitido' }, 400);
        const r = await fetch(target);
        return new Response(r.body, {
          status: r.status,
          headers: { ...cors, 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream' },
        });
      }

      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
  },
};
