export default {
  async fetch(req, env) {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const expectedToken = env.HLS_QUEUE_PRODUCER_TOKEN;
    if (expectedToken) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== expectedToken) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    const { trackId, artistId, inputKey } = body ?? {};
    if (!trackId || !artistId || !inputKey) {
      return new Response("Missing job fields", { status: 400 });
    }

    await env.HLS_TRANSCODE_QUEUE.send({ trackId, artistId, inputKey });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
export default {
  async fetch(req, env) {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (env.HLS_QUEUE_PRODUCER_TOKEN) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const expected = `Bearer ${env.HLS_QUEUE_PRODUCER_TOKEN}`;
      if (authHeader !== expected) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { trackId, artistId, inputKey } = body ?? {};
    if (!trackId || !artistId || !inputKey) {
      return new Response("Missing job fields", { status: 400 });
    }

    await env.HLS_TRANSCODE_QUEUE.send({
      trackId,
      artistId,
      inputKey,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
