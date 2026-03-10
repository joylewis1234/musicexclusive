import http from "http";
import { mkdirSync, rmSync, createWriteStream, readdirSync, readFileSync } from "fs";
import { join, extname } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import os from "os";
import { randomUUID } from "crypto";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const {
  PORT = "8788",
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  TRANSCODE_AUTH_TOKEN,
  MAX_BODY_BYTES = "1048576",
  HLS_SEGMENT_SECONDS = "6",
  HLS_AUDIO_BITRATE = "128k",
} = process.env;

if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing R2 credentials (R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const send = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const downloadToFile = async (key, filePath) => {
  const response = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  if (!response.Body) throw new Error("Missing body for R2 object");
  await new Promise((resolve, reject) => {
    const out = createWriteStream(filePath);
    response.Body.pipe(out);
    response.Body.on("error", reject);
    out.on("finish", resolve);
    out.on("error", reject);
  });
};

const uploadFile = async (key, filePath) => {
  const body = readFileSync(filePath);
  const contentType = key.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : "video/mp2t";
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
};

const transcodeToHls = (inputPath, outputDir) =>
  new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-hide_banner",
      "-i",
      inputPath,
      "-vn",
      "-codec:a",
      "aac",
      "-b:a",
      HLS_AUDIO_BITRATE,
      "-f",
      "hls",
      "-hls_time",
      HLS_SEGMENT_SECONDS,
      "-hls_playlist_type",
      "vod",
      "-hls_segment_filename",
      join(outputDir, "seg_%03d.ts"),
      join(outputDir, "master.m3u8"),
    ];
    const proc = spawn("ffmpeg", args, { stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit code ${code}`));
    });
  });

const readJsonBody = async (req) => {
  const maxBytes = Number(MAX_BODY_BYTES);
  let size = 0;
  let body = "";
  for await (const chunk of req) {
    size += chunk.length;
    if (maxBytes > 0 && size > maxBytes) {
      throw new Error("Request body too large");
    }
    body += chunk.toString();
  }
  if (!body) throw new Error("Missing request body");
  return JSON.parse(body);
};

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/transcode") {
    return send(res, 404, { error: "Not found" });
  }

  if (TRANSCODE_AUTH_TOKEN) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${TRANSCODE_AUTH_TOKEN}`) {
      return send(res, 401, { error: "Unauthorized" });
    }
  }

  try {
    const { trackId, artistId, inputKey } = await readJsonBody(req);
    if (!trackId || !artistId || !inputKey) {
      return send(res, 400, { error: "Missing trackId, artistId, or inputKey" });
    }

    const tmpRoot = join(os.tmpdir(), "hls-transcoder");
    const workDir = join(tmpRoot, `${trackId}-${randomUUID()}`);
    mkdirSync(workDir, { recursive: true });

    const inputExt = extname(inputKey) || ".audio";
    const inputPath = join(workDir, `input${inputExt}`);

    try {
      await downloadToFile(inputKey, inputPath);
      await transcodeToHls(inputPath, workDir);

      const files = readdirSync(workDir);
      const base = `hls/${trackId}/`;
      for (const file of files) {
        if (file.endsWith(".m3u8") || file.startsWith("seg_")) {
          await uploadFile(`${base}${file}`, join(workDir, file));
        }
      }

      return send(res, 200, { ok: true, trackId });
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("Transcode error:", err);
    return send(res, 500, { error: err instanceof Error ? err.message : "Transcode failed" });
  }
});

server.listen(Number(PORT), () => {
  console.log(`HLS transcoder listening on :${PORT}`);
});
