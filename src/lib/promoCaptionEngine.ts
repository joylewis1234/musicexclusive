export type CaptionLength = "short" | "medium" | "long";
export type GenreKey =
  | "hiphop"
  | "rnb"
  | "pop"
  | "afrobeats"
  | "faith"
  | "indie"
  | "electronic"
  | "alt"
  | "other";
export type VibeKey = "hype" | "mysterious" | "emotional" | "faith" | "luxury" | "punchy";
export type CtaStyle = "vault" | "stream";

export interface PromoCaptionRequest {
  trackTitle: string;
  artistName: string;
  genre: string;
  vibe: string;
  keywords: string[];
  ctaStyle: string;
}

export interface PromoCaption {
  text: string;
  length: CaptionLength;
}

export interface PromoCaptionResponse {
  captions: PromoCaption[];
  hashtags: string[];
  storyOverlays: string[];
}

interface NormalizedInput {
  trackTitle: string;
  artistName: string;
  genre: string;
  genreKey: GenreKey;
  vibe: VibeKey;
  keywords: string[];
  ctaStyle: CtaStyle;
}

interface CaptionCandidate {
  text: string;
  length: CaptionLength;
  templateId: string;
  score: number;
}

const BRAND = {
  exclusivity: [
    "before Spotify",
    "before Apple Music",
    "inside the Vault first",
    "exclusive on Music Exclusive",
    "early access only",
    "for the first listeners",
  ],
  ctaVault: [
    "Join the Vault",
    "Get inside the Vault",
    "Hear it first",
    "Tap in early",
    "Be first to hear it",
  ],
  ctaStream: [
    "Stream Exclusive",
    "Listen now",
    "Press play first",
    "Run it up",
    "Start listening",
  ],
  overlays: ["FIRST LISTEN", "VAULT ONLY", "NEW DROP", "OUT NOW"],
  hashtags: ["#MusicExclusive", "#VaultOnly", "#FirstListen", "#NewMusic"],
} as const;

const VIBE_PACKS: Record<
  VibeKey,
  { openers: string[]; closers: string[]; overlays: string[]; tags: string[]; descriptors: string[] }
> = {
  hype: {
    openers: ["New heat.", "This one is different.", "Turn this all the way up.", "All gas from the first second."],
    closers: ["Don't miss this.", "This one's for the real fans.", "Get in early.", "Run this one up first."],
    overlays: ["TURN THIS UP", "NO SKIPS", "RUN IT UP"],
    tags: ["#RunItUp", "#TurnItUp"],
    descriptors: ["high-energy", "all-gas", "first-listen energy"],
  },
  mysterious: {
    openers: ["Not for everyone.", "Something rare just landed.", "Keep this close.", "The early listeners will understand."],
    closers: ["You'll get it when you hear it.", "Only a few hear this first.", "The Vault knows first.", "This one moves in silence."],
    overlays: ["RARE SOUND", "KEEP THIS CLOSE", "NOT FOR EVERYONE"],
    tags: ["#RareSound", "#SecretDrop"],
    descriptors: ["dark-toned", "rare", "inside-only"],
  },
  emotional: {
    openers: ["This one hits different.", "For the late-night listeners.", "Let this sit with you.", "You feel this one the first time through."],
    closers: ["Hear it early.", "Sit with this one.", "For those who feel everything.", "This deserves repeat listens."],
    overlays: ["FEEL THIS ONE", "LATE NIGHT", "ON REPEAT"],
    tags: ["#FeelThis", "#OnRepeat"],
    descriptors: ["honest", "raw", "late-night"],
  },
  faith: {
    openers: ["Something uplifting just dropped.", "For the ones who need this message.", "Let this bless your timeline.", "This one carries something deeper."],
    closers: ["Listen with intention.", "A message before the world hears it.", "Early access to something deeper.", "Play this with purpose."],
    overlays: ["MORE THAN MUSIC", "HEAR THIS EARLY", "MESSAGE INSIDE"],
    tags: ["#FaithMusic", "#Inspirational"],
    descriptors: ["uplifting", "purpose-driven", "hope-filled"],
  },
  luxury: {
    openers: ["Premium sound only.", "This is not a regular drop.", "Exclusive means exclusive.", "This one belongs with the select few."],
    closers: ["Early access for the select few.", "First-listener energy only.", "This belongs in the Vault.", "Keep this one close."],
    overlays: ["PREMIUM ONLY", "VIP LISTEN", "EXCLUSIVE ENERGY"],
    tags: ["#PremiumSound", "#VIPVibes"],
    descriptors: ["elevated", "premium", "VIP"],
  },
  punchy: {
    openers: ["Out now.", "First listen.", "Vault only.", "New drop."],
    closers: ["Tap in.", "Hear it first.", "Don't wait.", "Play it now."],
    overlays: ["FIRST LISTEN", "VAULT ONLY", "OUT NOW"],
    tags: ["#NowPlaying", "#FirstListen"],
    descriptors: ["sharp", "direct", "clean"],
  },
};

const GENRE_PACKS: Record<GenreKey, { phrases: string[]; tags: string[] }> = {
  hiphop: {
    phrases: ["for the real ones", "straight pressure", "no skips", "made for heavy rotation"],
    tags: ["#HipHop", "#Rap", "#Bars", "#NewRap"],
  },
  rnb: {
    phrases: ["late-night rotation", "smooth all the way through", "for the repeat button", "made for mood-setting"],
    tags: ["#RnB", "#Soul", "#LateNightVibes", "#Smooth"],
  },
  pop: {
    phrases: ["made to stay in your head", "instant replay", "playlist-ready", "hook-first energy"],
    tags: ["#Pop", "#PopMusic", "#NewPop", "#PlaylistReady"],
  },
  afrobeats: {
    phrases: ["rhythm-heavy", "global energy", "feel-good motion", "pure movement from the first play"],
    tags: ["#Afrobeats", "#AfroMusic", "#GlobalSounds", "#NewAfrobeats"],
  },
  faith: {
    phrases: ["message in the music", "hope in every line", "uplifting from start to finish", "built to encourage"],
    tags: ["#ChristianMusic", "#Gospel", "#FaithMusic", "#Inspirational"],
  },
  indie: {
    phrases: ["for the discoverers", "off the beaten path", "for listeners who know", "something worth finding early"],
    tags: ["#IndieMusic", "#IndependentArtist", "#IndieVibes", "#NewIndie"],
  },
  electronic: {
    phrases: ["built for atmosphere", "night-drive energy", "sound that moves", "made for headphones and volume"],
    tags: ["#ElectronicMusic", "#EDM", "#Synth", "#NightDrive"],
  },
  alt: {
    phrases: ["different on purpose", "left of center", "for the ones who want more", "not built for the ordinary"],
    tags: ["#AltMusic", "#Alternative", "#AltVibes", "#NewAlternative"],
  },
  other: {
    phrases: ["worth the first listen", "something fresh", "for early listeners", "made to stand out"],
    tags: ["#NewMusic", "#MusicDiscovery", "#IndependentArtist", "#NowPlaying"],
  },
};

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function titleize(value: string) {
  return normalizeWhitespace(value)
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function classifyGenre(genre: string): GenreKey {
  const normalized = genre.toLowerCase();
  if (/(hip[\s-]?hop|rap|trap)/.test(normalized)) return "hiphop";
  if (/(r&b|rnb|neo soul|soul)/.test(normalized)) return "rnb";
  if (/pop/.test(normalized)) return "pop";
  if (/(afrobeats|afrobeat|amapiano)/.test(normalized)) return "afrobeats";
  if (/(faith|gospel|christian|worship)/.test(normalized)) return "faith";
  if (/indie/.test(normalized)) return "indie";
  if (/(electronic|edm|dance|house|techno|synth)/.test(normalized)) return "electronic";
  if (/(alt|alternative|rock|punk|grunge)/.test(normalized)) return "alt";
  return "other";
}

function normalizeVibe(vibe: string): VibeKey {
  const normalized = vibe.toLowerCase().trim();
  return normalized in VIBE_PACKS ? (normalized as VibeKey) : "hype";
}

function normalizeCtaStyle(ctaStyle: string): CtaStyle {
  return ctaStyle === "vault" ? "vault" : "stream";
}

function normalizeInput(body: PromoCaptionRequest): NormalizedInput {
  const trackTitle = normalizeWhitespace(body.trackTitle || "");
  const artistName = normalizeWhitespace(body.artistName || "");
  const genre = normalizeWhitespace(body.genre || "");
  const keywords = Array.from(
    new Set(
      (body.keywords || [])
        .map((keyword) => normalizeWhitespace(String(keyword || "")))
        .filter(Boolean)
        .slice(0, 6),
    ),
  );

  if (!trackTitle || !artistName || !genre) {
    throw new Error("trackTitle, artistName, and genre are required");
  }

  return {
    trackTitle,
    artistName,
    genre,
    genreKey: classifyGenre(genre),
    vibe: normalizeVibe(body.vibe || ""),
    keywords,
    ctaStyle: normalizeCtaStyle(body.ctaStyle || ""),
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(list: T[], random: () => number) {
  return list[Math.floor(random() * list.length)];
}

function maybe(probability: number, random: () => number) {
  return random() < probability;
}

function buildKeywordPhrase(keywords: string[], random: () => number) {
  if (!keywords.length) return "";
  if (keywords.length === 1) {
    const keyword = keywords[0];
    return pick(
      [
        `Built around ${keyword}.`,
        `${titleize(keyword)} all through this one.`,
        `You can feel the ${keyword} in every section.`,
      ],
      random,
    );
  }

  const [first, second] = keywords;
  return pick(
    [
      `Carrying ${first} and ${second} from the first listen.`,
      `You can hear the ${first} and ${second} throughout.`,
      `${titleize(first)} and ${titleize(second)} run through this drop.`,
    ],
    random,
  );
}

function cleanText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .trim();
}

function ensureLengthBand(text: string, length: CaptionLength, input: NormalizedInput) {
  const mediumExtension =
    "Music Exclusive puts the first listeners in position before the wider rollout.";
  const longExtension =
    input.ctaStyle === "vault"
      ? "That's what the Vault is for: real supporters getting the moment first, before the wider release catches up."
      : "That's what Music Exclusive is built for: real supporters getting the first listen before the wider release catches up.";

  let result = cleanText(text);

  if (length === "medium") {
    if (result.length <= 100) {
      result = cleanText(`${result} ${mediumExtension}`);
    }
    return result;
  }

  if (length === "long") {
    while (result.length <= 200) {
      result = cleanText(`${result} ${longExtension}`);
    }

    if (result.length > 300) {
      result = cleanText(result.slice(0, 297)) + "...";
    }
  }

  return result;
}

function normalizeForSimilarity(text: string) {
  return text
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function startsSimilarly(a: string, b: string) {
  const aWords = normalizeForSimilarity(a).split(" ").slice(0, 5).join(" ");
  const bWords = normalizeForSimilarity(b).split(" ").slice(0, 5).join(" ");
  return aWords.length > 0 && aWords === bWords;
}

function scoreCaption(text: string, length: CaptionLength, input: NormalizedInput) {
  let score = 0;
  const lower = text.toLowerCase();
  const len = text.length;

  if (lower.includes(input.trackTitle.toLowerCase())) score += 3;
  if (lower.includes(input.artistName.toLowerCase())) score += 2;
  if (lower.includes("music exclusive")) score += 2;
  if (
    lower.includes("vault") ||
    lower.includes("before spotify") ||
    lower.includes("before apple music") ||
    lower.includes("early access")
  ) {
    score += 3;
  }
  if (
    lower.includes("join the vault") ||
    lower.includes("stream exclusive") ||
    lower.includes("listen now") ||
    lower.includes("hear it first")
  ) {
    score += 2;
  }

  if (length === "short" && len <= 100) score += 3;
  if (length === "medium" && len > 100 && len <= 200) score += 3;
  if (length === "long" && len > 200 && len <= 300) score += 3;

  if ((text.match(/!/g) || []).length > 2) score -= 1;
  if ((text.match(/[🔥🎵✨💎👑]/g) || []).length > 2) score -= 1;
  if (len > 300) score -= 10;

  return score;
}

function buildCandidate(text: string, length: CaptionLength, templateId: string, input: NormalizedInput): CaptionCandidate {
  const cleaned = ensureLengthBand(text, length, input);
  return {
    text: cleaned,
    length,
    templateId,
    score: scoreCaption(cleaned, length, input),
  };
}

function buildCaptionCandidates(input: NormalizedInput) {
  const seed = hashString(JSON.stringify(input));
  const random = createSeededRandom(seed);
  const vibePack = VIBE_PACKS[input.vibe];
  const genrePack = GENRE_PACKS[input.genreKey];
  const cta = input.ctaStyle === "vault" ? pick([...BRAND.ctaVault], random) : pick([...BRAND.ctaStream], random);

  const candidates: CaptionCandidate[] = [];

  for (let i = 0; i < 12; i += 1) {
    const opener = pick([...vibePack.openers], random);
    const closer = pick([...vibePack.closers], random);
    const exclusivePhrase = pick([...BRAND.exclusivity], random);
    const genrePhrase = pick([...genrePack.phrases], random);
    const descriptor = pick([...vibePack.descriptors], random);
    const keywordPhrase = maybe(0.5, random) ? buildKeywordPhrase(input.keywords, random) : "";
    const maybeBrandMention = maybe(0.5, random) ? "on Music Exclusive" : "inside the Vault";

    const shortTemplates = [
      `"${input.trackTitle}" just landed ${exclusivePhrase}. ${cta}.`,
      `${input.artistName} dropped "${input.trackTitle}" ${exclusivePhrase}.`,
      `Vault only: "${input.trackTitle}" by ${input.artistName}.`,
      `${opener} "${input.trackTitle}" is here ${exclusivePhrase}.`,
      `${input.artistName} just dropped "${input.trackTitle}" ${maybeBrandMention}.`,
      `"${input.trackTitle}" ${exclusivePhrase}. ${cta}.`,
    ];

    const mediumTemplates = [
      `${input.artistName} just dropped "${input.trackTitle}" ${exclusivePhrase}. ${genrePhrase}. ${cta}.`,
      `"${input.trackTitle}" is live ${maybeBrandMention} ${exclusivePhrase}. If you're early, this one's for you. ${cta}.`,
      `${opener} ${input.artistName}'s "${input.trackTitle}" is available ${exclusivePhrase}. ${closer}`,
      `New from ${input.artistName}: "${input.trackTitle}" is out now ${maybeBrandMention}. ${genrePhrase}. ${cta}.`,
      `${input.artistName} brought "${input.trackTitle}" to Music Exclusive ${exclusivePhrase}. ${keywordPhrase} ${cta}.`,
    ];

    const longTemplates = [
      `${input.artistName} just dropped "${input.trackTitle}" on Music Exclusive, which means you can hear it ${exclusivePhrase}. ${genrePhrase}. ${keywordPhrase} ${cta}.`,
      `If you're the kind of listener who wants the music before everyone else, "${input.trackTitle}" by ${input.artistName} is exactly that. ${exclusivePhrase}, built for ${descriptor} listeners. ${cta}.`,
      `${opener} "${input.trackTitle}" from ${input.artistName} is available ${exclusivePhrase}, only on Music Exclusive. ${genrePhrase}. ${closer} ${cta}.`,
      `${input.artistName} is giving early listeners something real with "${input.trackTitle}". It's live ${maybeBrandMention}, ${exclusivePhrase}, and made for ${genrePhrase}. ${keywordPhrase} ${cta}.`,
    ];

    shortTemplates.forEach((text, index) => {
      candidates.push(buildCandidate(text, "short", `short-${i}-${index}`, input));
    });
    mediumTemplates.forEach((text, index) => {
      candidates.push(buildCandidate(text, "medium", `medium-${i}-${index}`, input));
    });
    longTemplates.forEach((text, index) => {
      candidates.push(buildCandidate(text, "long", `long-${i}-${index}`, input));
    });
  }

  return candidates;
}

function dedupeCaptions(candidates: CaptionCandidate[]) {
  const accepted: CaptionCandidate[] = [];
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    const duplicate = accepted.some((existing) => {
      const normalizedA = normalizeForSimilarity(existing.text);
      const normalizedB = normalizeForSimilarity(candidate.text);
      return (
        normalizedA === normalizedB ||
        startsSimilarly(existing.text, candidate.text) ||
        (existing.templateId.split("-").slice(0, 2).join("-") ===
          candidate.templateId.split("-").slice(0, 2).join("-") &&
          Math.abs(existing.text.length - candidate.text.length) < 20)
      );
    });

    if (!duplicate) {
      accepted.push(candidate);
    }
  }
  return accepted;
}

function pickCaptionsByLength(candidates: CaptionCandidate[]): PromoCaption[] {
  const targetCounts: Record<CaptionLength, number> = {
    short: 2,
    medium: 3,
    long: 2,
  };

  const result: PromoCaption[] = [];

  (["short", "medium", "long"] as CaptionLength[]).forEach((length) => {
    const picks = candidates
      .filter((candidate) => candidate.length === length)
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCounts[length]);

    picks.forEach((pick) => {
      result.push({ text: pick.text, length: pick.length });
    });
  });

  return result;
}

function toHashtag(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (!normalized) return null;
  const compact = normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
  return compact ? `#${compact}` : null;
}

function buildHashtags(input: NormalizedInput) {
  const vibePack = VIBE_PACKS[input.vibe];
  const genrePack = GENRE_PACKS[input.genreKey];
  const ctaTags =
    input.ctaStyle === "vault" ? ["#JoinTheVault", "#VaultAccess"] : ["#StreamExclusive", "#ListenNow"];
  const discoveryTags = ["#MusicDiscovery", "#NowPlaying", "#IndependentArtist", "#ExclusiveDrop"];

  const derivedTags = [toHashtag(input.genre), ...input.keywords.slice(0, 3).map(toHashtag)].filter(
    (tag): tag is string => Boolean(tag),
  );

  return Array.from(
    new Set([...BRAND.hashtags, ...discoveryTags, ...ctaTags, ...genrePack.tags, ...vibePack.tags, ...derivedTags]),
  ).slice(0, 15);
}

function buildStoryOverlays(input: NormalizedInput) {
  const vibePack = VIBE_PACKS[input.vibe];
  const ctaOverlays =
    input.ctaStyle === "vault"
      ? ["JOIN THE VAULT", "HEAR IT FIRST", "EARLY ACCESS"]
      : ["STREAM EXCLUSIVE", "LISTEN NOW", "PRESS PLAY"];

  return Array.from(new Set([BRAND.overlays[0], ctaOverlays[0], vibePack.overlays[0]])).filter(
    (overlay) => overlay.length <= 20,
  ).slice(0, 3);
}

function buildFallbackResponse(input: NormalizedInput): PromoCaptionResponse {
  return {
    captions: [
      { text: `Vault only: "${input.trackTitle}" by ${input.artistName}.`, length: "short" },
      {
        text: `${input.artistName} just dropped "${input.trackTitle}" on Music Exclusive. Hear it before Spotify. Join the Vault.`,
        length: "medium",
      },
      {
        text: `First-listener moment: "${input.trackTitle}" by ${input.artistName} is live inside the Vault before the world hears it. Join the Vault and get there early.`,
        length: "long",
      },
      { text: `"${input.trackTitle}" dropped early on Music Exclusive. Hear it first.`, length: "short" },
      {
        text: `${input.artistName} brought "${input.trackTitle}" to the Vault first, built for listeners who want the drop before Spotify and Apple Music. Stream Exclusive.`,
        length: "medium",
      },
      {
        text: `${input.artistName} just gave early listeners a real first look at "${input.trackTitle}" on Music Exclusive. It's live inside the Vault first, made for the fans who want the music before everyone else. Stream Exclusive.`,
        length: "long",
      },
      {
        text: `Music Exclusive has "${input.trackTitle}" from ${input.artistName} live before Spotify. Hear it first.`,
        length: "medium",
      },
    ],
    hashtags: buildHashtags(input),
    storyOverlays: buildStoryOverlays(input),
  };
}

export function generatePromoCaptions(body: PromoCaptionRequest): PromoCaptionResponse {
  const input = normalizeInput(body);
  const candidates = buildCaptionCandidates(input);
  const deduped = dedupeCaptions(candidates);
  const captions = pickCaptionsByLength(deduped);
  const hashtags = buildHashtags(input);
  const storyOverlays = buildStoryOverlays(input);

  return captions.length === 7 ? { captions, hashtags, storyOverlays } : buildFallbackResponse(input);
}
