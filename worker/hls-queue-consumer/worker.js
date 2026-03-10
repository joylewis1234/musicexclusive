const buildHeaders = (token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const triggerExternalTranscode = async (job, env) => {
  const url = env.HLS_TRANSCODER_URL;
  if (!url) throw new Error("Missing HLS_TRANSCODER_URL");

  const timeoutMs = Number(env.HLS_TRANSCODER_TIMEOUT_MS ?? 120000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(env.HLS_TRANSCODER_TOKEN),
      body: JSON.stringify(job),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Transcoder error ${response.status} ${text}`.trim());
    }
  } finally {
    clearTimeout(timeout);
  }
};

export default {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      const { trackId, artistId, inputKey } = msg.body ?? {};
      if (!trackId || !artistId || !inputKey) {
        console.log("HLS: missing job fields", msg.body);
        msg.ack();
        continue;
      }

      try {
        console.log("HLS: dispatch to transcoder", { trackId, inputKey });
        await triggerExternalTranscode({ trackId, artistId, inputKey }, env);
      } catch (err) {
        console.warn("HLS dispatch failed, retrying job", { trackId, error: String(err) });
        msg.retry();
        continue;
      }

      console.log("HLS: done", { trackId });
      msg.ack();
    }
  },
};
