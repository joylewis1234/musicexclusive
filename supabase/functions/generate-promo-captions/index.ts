import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── Types ──────────────────────────────────────────────────────────
type CaptionLength = "short" | "medium" | "long";
type GenreKey = "hiphop" | "rnb" | "pop" | "afrobeats" | "faith" | "indie" | "electronic" | "alt" | "other";
type VibeKey = "hype" | "mysterious" | "emotional" | "faith" | "luxury" | "punchy";
type CtaStyle = "vault" | "stream";

interface PromoCaptionRequest {
  trackTitle: string;
  artistName: string;
  genre: string;
  vibe: string;
  keywords: string[];
  ctaStyle: string;
}

interface PromoCaption { text: string; length: CaptionLength; }
interface PromoCaptionResponse { captions: PromoCaption[]; hashtags: string[]; storyOverlays: string[]; }

interface NormalizedInput {
  trackTitle: string; artistName: string; genre: string;
  genreKey: GenreKey; vibe: VibeKey; keywords: string[]; ctaStyle: CtaStyle;
}

interface CaptionCandidate { text: string; length: CaptionLength; templateId: string; score: number; }

// ── Brand & Packs ──────────────────────────────────────────────────
const BRAND = {
  exclusivity: ["before Spotify","before Apple Music","inside the Vault first","exclusive on Music Exclusive","early access only","for the first listeners"],
  ctaVault: ["Join the Vault","Get inside the Vault","Hear it first","Tap in early","Be first to hear it"],
  ctaStream: ["Stream Exclusive","Listen now","Press play first","Run it up","Start listening"],
  overlays: ["FIRST LISTEN","VAULT ONLY","NEW DROP","OUT NOW"],
  hashtags: ["#MusicExclusive","#VaultOnly","#FirstListen","#NewMusic"],
} as const;

const VIBE_PACKS: Record<VibeKey, { openers: string[]; closers: string[]; overlays: string[]; tags: string[]; descriptors: string[] }> = {
  hype: { openers:["New heat.","This one is different.","Turn this all the way up.","All gas from the first second."], closers:["Don't miss this.","This one's for the real fans.","Get in early.","Run this one up first."], overlays:["TURN THIS UP","NO SKIPS","RUN IT UP"], tags:["#RunItUp","#TurnItUp"], descriptors:["high-energy","all-gas","first-listen energy"] },
  mysterious: { openers:["Not for everyone.","Something rare just landed.","Keep this close.","The early listeners will understand."], closers:["You'll get it when you hear it.","Only a few hear this first.","The Vault knows first.","This one moves in silence."], overlays:["RARE SOUND","KEEP THIS CLOSE","NOT FOR EVERYONE"], tags:["#RareSound","#SecretDrop"], descriptors:["dark-toned","rare","inside-only"] },
  emotional: { openers:["This one hits different.","For the late-night listeners.","Let this sit with you.","You feel this one the first time through."], closers:["Hear it early.","Sit with this one.","For those who feel everything.","This deserves repeat listens."], overlays:["FEEL THIS ONE","LATE NIGHT","ON REPEAT"], tags:["#FeelThis","#OnRepeat"], descriptors:["honest","raw","late-night"] },
  faith: { openers:["Something uplifting just dropped.","For the ones who need this message.","Let this bless your timeline.","This one carries something deeper."], closers:["Listen with intention.","A message before the world hears it.","Early access to something deeper.","Play this with purpose."], overlays:["MORE THAN MUSIC","HEAR THIS EARLY","MESSAGE INSIDE"], tags:["#FaithMusic","#Inspirational"], descriptors:["uplifting","purpose-driven","hope-filled"] },
  luxury: { openers:["Premium sound only.","This is not a regular drop.","Exclusive means exclusive.","This one belongs with the select few."], closers:["Early access for the select few.","First-listener energy only.","This belongs in the Vault.","Keep this one close."], overlays:["PREMIUM ONLY","VIP LISTEN","EXCLUSIVE ENERGY"], tags:["#PremiumSound","#VIPVibes"], descriptors:["elevated","premium","VIP"] },
  punchy: { openers:["Out now.","First listen.","Vault only.","New drop."], closers:["Tap in.","Hear it first.","Don't wait.","Play it now."], overlays:["FIRST LISTEN","VAULT ONLY","OUT NOW"], tags:["#NowPlaying","#FirstListen"], descriptors:["sharp","direct","clean"] },
};

const GENRE_PACKS: Record<GenreKey, { phrases: string[]; tags: string[] }> = {
  hiphop: { phrases:["for the real ones","straight pressure","no skips","made for heavy rotation"], tags:["#HipHop","#Rap","#Bars","#NewRap"] },
  rnb: { phrases:["late-night rotation","smooth all the way through","for the repeat button","made for mood-setting"], tags:["#RnB","#Soul","#LateNightVibes","#Smooth"] },
  pop: { phrases:["made to stay in your head","instant replay","playlist-ready","hook-first energy"], tags:["#Pop","#PopMusic","#NewPop","#PlaylistReady"] },
  afrobeats: { phrases:["rhythm-heavy","global energy","feel-good motion","pure movement from the first play"], tags:["#Afrobeats","#AfroMusic","#GlobalSounds","#NewAfrobeats"] },
  faith: { phrases:["message in the music","hope in every line","uplifting from start to finish","built to encourage"], tags:["#ChristianMusic","#Gospel","#FaithMusic","#Inspirational"] },
  indie: { phrases:["for the discoverers","off the beaten path","for listeners who know","something worth finding early"], tags:["#IndieMusic","#IndependentArtist","#IndieVibes","#NewIndie"] },
  electronic: { phrases:["built for atmosphere","night-drive energy","sound that moves","made for headphones and volume"], tags:["#ElectronicMusic","#EDM","#Synth","#NightDrive"] },
  alt: { phrases:["different on purpose","left of center","for the ones who want more","not built for the ordinary"], tags:["#AltMusic","#Alternative","#AltVibes","#NewAlternative"] },
  other: { phrases:["worth the first listen","something fresh","for early listeners","made to stand out"], tags:["#NewMusic","#MusicDiscovery","#IndependentArtist","#NowPlaying"] },
};

// ── Helpers ────────────────────────────────────────────────────────
function normalizeWhitespace(v: string) { return v.trim().replace(/\s+/g, " "); }
function titleize(v: string) { return normalizeWhitespace(v).split(" ").map(p => p ? p[0].toUpperCase() + p.slice(1) : p).join(" "); }

function classifyGenre(g: string): GenreKey {
  const n = g.toLowerCase();
  if (/(hip[\s-]?hop|rap|trap)/.test(n)) return "hiphop";
  if (/(r&b|rnb|neo soul|soul)/.test(n)) return "rnb";
  if (/pop/.test(n)) return "pop";
  if (/(afrobeats|afrobeat|amapiano)/.test(n)) return "afrobeats";
  if (/(faith|gospel|christian|worship)/.test(n)) return "faith";
  if (/indie/.test(n)) return "indie";
  if (/(electronic|edm|dance|house|techno|synth)/.test(n)) return "electronic";
  if (/(alt|alternative|rock|punk|grunge)/.test(n)) return "alt";
  return "other";
}

function normalizeVibe(v: string): VibeKey { const n = v.toLowerCase().trim(); return n in VIBE_PACKS ? (n as VibeKey) : "hype"; }
function normalizeCtaStyle(c: string): CtaStyle { return c === "vault" ? "vault" : "stream"; }

function normalizeInput(body: PromoCaptionRequest): NormalizedInput {
  const trackTitle = normalizeWhitespace(body.trackTitle || "");
  const artistName = normalizeWhitespace(body.artistName || "");
  const genre = normalizeWhitespace(body.genre || "");
  const keywords = Array.from(new Set((body.keywords || []).map(k => normalizeWhitespace(String(k || ""))).filter(Boolean).slice(0, 6)));
  if (!trackTitle || !artistName || !genre) throw new Error("trackTitle, artistName, and genre are required");
  return { trackTitle, artistName, genre, genreKey: classifyGenre(genre), vibe: normalizeVibe(body.vibe || ""), keywords, ctaStyle: normalizeCtaStyle(body.ctaStyle || "") };
}

function hashString(v: string) { let h = 2166136261; for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function createSeededRandom(seed: number) { let s = seed || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function pick<T>(list: T[], r: () => number) { return list[Math.floor(r() * list.length)]; }
function maybe(p: number, r: () => number) { return r() < p; }

function buildKeywordPhrase(keywords: string[], r: () => number) {
  if (!keywords.length) return "";
  if (keywords.length === 1) return pick([`Built around ${keywords[0]}.`, `${titleize(keywords[0])} all through this one.`, `You can feel the ${keywords[0]} in every section.`], r);
  const [a, b] = keywords;
  return pick([`Carrying ${a} and ${b} from the first listen.`, `You can hear the ${a} and ${b} throughout.`, `${titleize(a)} and ${titleize(b)} run through this drop.`], r);
}

function cleanText(t: string) { return t.replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1").replace(/([.!?]){2,}/g, "$1").trim(); }

function ensureLengthBand(text: string, length: CaptionLength, input: NormalizedInput) {
  const medExt = "Music Exclusive puts the first listeners in position before the wider rollout.";
  const longExt = input.ctaStyle === "vault"
    ? "That's what the Vault is for: real supporters getting the moment first, before the wider release catches up."
    : "That's what Music Exclusive is built for: real supporters getting the first listen before the wider release catches up.";
  let r = cleanText(text);
  if (length === "medium") { if (r.length <= 100) r = cleanText(`${r} ${medExt}`); return r; }
  if (length === "long") { while (r.length <= 200) r = cleanText(`${r} ${longExt}`); if (r.length > 300) r = cleanText(r.slice(0, 297)) + "..."; }
  return r;
}

function normalizeForSimilarity(t: string) { return t.toLowerCase().replace(/["'`]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function startsSimilarly(a: string, b: string) { const aw = normalizeForSimilarity(a).split(" ").slice(0, 5).join(" "); const bw = normalizeForSimilarity(b).split(" ").slice(0, 5).join(" "); return aw.length > 0 && aw === bw; }

function scoreCaption(text: string, length: CaptionLength, input: NormalizedInput) {
  let s = 0; const l = text.toLowerCase(); const len = text.length;
  if (l.includes(input.trackTitle.toLowerCase())) s += 3;
  if (l.includes(input.artistName.toLowerCase())) s += 2;
  if (l.includes("music exclusive")) s += 2;
  if (l.includes("vault") || l.includes("before spotify") || l.includes("before apple music") || l.includes("early access")) s += 3;
  if (l.includes("join the vault") || l.includes("stream exclusive") || l.includes("listen now") || l.includes("hear it first")) s += 2;
  if (length === "short" && len <= 100) s += 3;
  if (length === "medium" && len > 100 && len <= 200) s += 3;
  if (length === "long" && len > 200 && len <= 300) s += 3;
  if ((text.match(/!/g) || []).length > 2) s -= 1;
  if ((text.match(/[🔥🎵✨💎👑]/g) || []).length > 2) s -= 1;
  if (len > 300) s -= 10;
  return s;
}

function buildCandidate(text: string, length: CaptionLength, templateId: string, input: NormalizedInput): CaptionCandidate {
  const cleaned = ensureLengthBand(text, length, input);
  return { text: cleaned, length, templateId, score: scoreCaption(cleaned, length, input) };
}

function buildCaptionCandidates(input: NormalizedInput) {
  const seed = hashString(JSON.stringify(input));
  const random = createSeededRandom(seed);
  const vp = VIBE_PACKS[input.vibe]; const gp = GENRE_PACKS[input.genreKey];
  const cta = input.ctaStyle === "vault" ? pick([...BRAND.ctaVault], random) : pick([...BRAND.ctaStream], random);
  const candidates: CaptionCandidate[] = [];
  for (let i = 0; i < 12; i++) {
    const opener = pick([...vp.openers], random); const closer = pick([...vp.closers], random);
    const ep = pick([...BRAND.exclusivity], random); const gph = pick([...gp.phrases], random);
    const desc = pick([...vp.descriptors], random);
    const kp = maybe(0.5, random) ? buildKeywordPhrase(input.keywords, random) : "";
    const mb = maybe(0.5, random) ? "on Music Exclusive" : "inside the Vault";
    const short = [
      `"${input.trackTitle}" just landed ${ep}. ${cta}.`,
      `${input.artistName} dropped "${input.trackTitle}" ${ep}.`,
      `Vault only: "${input.trackTitle}" by ${input.artistName}.`,
      `${opener} "${input.trackTitle}" is here ${ep}.`,
      `${input.artistName} just dropped "${input.trackTitle}" ${mb}.`,
      `"${input.trackTitle}" ${ep}. ${cta}.`,
    ];
    const med = [
      `${input.artistName} just dropped "${input.trackTitle}" ${ep}. ${gph}. ${cta}.`,
      `"${input.trackTitle}" is live ${mb} ${ep}. If you're early, this one's for you. ${cta}.`,
      `${opener} ${input.artistName}'s "${input.trackTitle}" is available ${ep}. ${closer}`,
      `New from ${input.artistName}: "${input.trackTitle}" is out now ${mb}. ${gph}. ${cta}.`,
      `${input.artistName} brought "${input.trackTitle}" to Music Exclusive ${ep}. ${kp} ${cta}.`,
    ];
    const long = [
      `${input.artistName} just dropped "${input.trackTitle}" on Music Exclusive, which means you can hear it ${ep}. ${gph}. ${kp} ${cta}.`,
      `If you're the kind of listener who wants the music before everyone else, "${input.trackTitle}" by ${input.artistName} is exactly that. ${ep}, built for ${desc} listeners. ${cta}.`,
      `${opener} "${input.trackTitle}" from ${input.artistName} is available ${ep}, only on Music Exclusive. ${gph}. ${closer} ${cta}.`,
      `${input.artistName} is giving early listeners something real with "${input.trackTitle}". It's live ${mb}, ${ep}, and made for ${gph}. ${kp} ${cta}.`,
    ];
    short.forEach((t, j) => candidates.push(buildCandidate(t, "short", `short-${i}-${j}`, input)));
    med.forEach((t, j) => candidates.push(buildCandidate(t, "medium", `medium-${i}-${j}`, input)));
    long.forEach((t, j) => candidates.push(buildCandidate(t, "long", `long-${i}-${j}`, input)));
  }
  return candidates;
}

function dedupeCaptions(candidates: CaptionCandidate[]) {
  const accepted: CaptionCandidate[] = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    const dup = accepted.some(e => {
      const na = normalizeForSimilarity(e.text); const nb = normalizeForSimilarity(c.text);
      return na === nb || startsSimilarly(e.text, c.text) || (e.templateId.split("-").slice(0, 2).join("-") === c.templateId.split("-").slice(0, 2).join("-") && Math.abs(e.text.length - c.text.length) < 20);
    });
    if (!dup) accepted.push(c);
  }
  return accepted;
}

function pickCaptionsByLength(candidates: CaptionCandidate[]): PromoCaption[] {
  const counts: Record<CaptionLength, number> = { short: 2, medium: 3, long: 2 };
  const result: PromoCaption[] = [];
  (["short", "medium", "long"] as CaptionLength[]).forEach(l => {
    candidates.filter(c => c.length === l).sort((a, b) => b.score - a.score).slice(0, counts[l]).forEach(p => result.push({ text: p.text, length: p.length }));
  });
  return result;
}

function toHashtag(v: string) { const n = v.replace(/[^a-zA-Z0-9\s]/g, " ").trim(); if (!n) return null; const c = n.split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(""); return c ? `#${c}` : null; }

function buildHashtags(input: NormalizedInput) {
  const vp = VIBE_PACKS[input.vibe]; const gp = GENRE_PACKS[input.genreKey];
  const ct = input.ctaStyle === "vault" ? ["#JoinTheVault","#VaultAccess"] : ["#StreamExclusive","#ListenNow"];
  const dt = ["#MusicDiscovery","#NowPlaying","#IndependentArtist","#ExclusiveDrop"];
  const derived = [toHashtag(input.genre), ...input.keywords.slice(0, 3).map(toHashtag)].filter((t): t is string => Boolean(t));
  return Array.from(new Set([...BRAND.hashtags, ...dt, ...ct, ...gp.tags, ...vp.tags, ...derived])).slice(0, 15);
}

function buildStoryOverlays(input: NormalizedInput) {
  const vp = VIBE_PACKS[input.vibe];
  const co = input.ctaStyle === "vault" ? ["JOIN THE VAULT","HEAR IT FIRST","EARLY ACCESS"] : ["STREAM EXCLUSIVE","LISTEN NOW","PRESS PLAY"];
  return Array.from(new Set([BRAND.overlays[0], co[0], vp.overlays[0]])).filter(o => o.length <= 20).slice(0, 3);
}

function buildFallbackResponse(input: NormalizedInput): PromoCaptionResponse {
  return {
    captions: [
      { text: `Vault only: "${input.trackTitle}" by ${input.artistName}.`, length: "short" },
      { text: `${input.artistName} just dropped "${input.trackTitle}" on Music Exclusive. Hear it before Spotify. Join the Vault.`, length: "medium" },
      { text: `First-listener moment: "${input.trackTitle}" by ${input.artistName} is live inside the Vault before the world hears it. Join the Vault and get there early.`, length: "long" },
      { text: `"${input.trackTitle}" dropped early on Music Exclusive. Hear it first.`, length: "short" },
      { text: `${input.artistName} brought "${input.trackTitle}" to the Vault first, built for listeners who want the drop before Spotify and Apple Music. Stream Exclusive.`, length: "medium" },
      { text: `${input.artistName} just gave early listeners a real first look at "${input.trackTitle}" on Music Exclusive. It's live inside the Vault first, made for the fans who want the music before everyone else. Stream Exclusive.`, length: "long" },
      { text: `Music Exclusive has "${input.trackTitle}" from ${input.artistName} live before Spotify. Hear it first.`, length: "medium" },
    ],
    hashtags: buildHashtags(input),
    storyOverlays: buildStoryOverlays(input),
  };
}

function generatePromoCaptions(body: PromoCaptionRequest): PromoCaptionResponse {
  const input = normalizeInput(body);
  const candidates = buildCaptionCandidates(input);
  const deduped = dedupeCaptions(candidates);
  const captions = pickCaptionsByLength(deduped);
  const hashtags = buildHashtags(input);
  const storyOverlays = buildStoryOverlays(input);
  return captions.length === 7 ? { captions, hashtags, storyOverlays } : buildFallbackResponse(input);
}

// ── Server ─────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = (await req.json()) as PromoCaptionRequest;
    const responsePayload = generatePromoCaptions(body);
    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate captions";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
