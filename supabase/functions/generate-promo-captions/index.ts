import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  trackTitle: string;
  artistName: string;
  genre: string;
  vibe: string;
  keywords: string[];
  ctaStyle: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackTitle, artistName, genre, vibe, keywords, ctaStyle } = await req.json() as RequestBody;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const vibeInstructions: Record<string, string> = {
      hype: "energetic, exciting, use fire emojis, build FOMO",
      mysterious: "intriguing, cryptic, use moon/star emojis, create curiosity",
      emotional: "heartfelt, vulnerable, use heart emojis, connect deeply",
      faith: "uplifting, spiritual, use praying hands/cross emojis, inspire hope",
      luxury: "exclusive, premium, use diamond/crown emojis, emphasize VIP access",
      punchy: "short, impactful, minimal emojis, straight to the point",
    };

    const vibeGuide = vibeInstructions[vibe] || vibeInstructions.hype;
    const keywordList = keywords.length > 0 ? `Incorporate these keywords naturally: ${keywords.join(", ")}` : "";
    const ctaPhrase = ctaStyle === "vault" ? "Join the Vault" : "Stream Exclusive";

    const systemPrompt = `You are a social media expert for musicians. Generate engaging captions for Instagram that promote exclusive music releases on Music Exclusive platform.

Key messaging rules:
- Always emphasize exclusivity: "before Spotify", "before Apple Music", "exclusive inside the Vault", "early access"
- Never be misleading - be authentic and genuine
- Include a call-to-action: "${ctaPhrase}"
- Mention "Music Exclusive" or "musicexclusive.co" naturally

Vibe for this request: ${vibeGuide}
${keywordList}`;

    const userPrompt = `Generate promotional content for:
- Track: "${trackTitle}"
- Artist: ${artistName}
- Genre: ${genre}

Please provide:
1. 7 caption options:
   - 2 short (under 100 characters)
   - 3 medium (100-200 characters)
   - 2 longer (200-300 characters)

2. 15 hashtags relevant to:
   - The genre (${genre})
   - Music discovery
   - Exclusive content
   - The artist vibe

3. 3 very short story text overlays (under 20 characters each) that could be added directly to the image

Format your response as JSON:
{
  "captions": [
    {"text": "caption here", "length": "short"},
    {"text": "caption here", "length": "medium"},
    {"text": "caption here", "length": "long"}
  ],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "storyOverlays": ["FIRST LISTEN", "VAULT ONLY", "NEW DROP"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI Gateway error:", error);
      throw new Error("Failed to generate captions");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Parse error:", e, "Content:", content);
      // Fallback response
      parsed = {
        captions: [
          { text: `🔥 "${trackTitle}" dropping exclusive on Music Exclusive! Hear it before the world. Link in bio!`, length: "short" },
          { text: `New heat from ${artistName}! "${trackTitle}" is ONLY available inside the Vault. Stream it now before it hits Spotify 🎵`, length: "medium" },
        ],
        hashtags: [
          "#MusicExclusive", "#NewMusic", "#ExclusiveDrop", `#${genre.replace(/\s/g, "")}`, "#VaultAccess",
          "#IndependentArtist", "#StreamNow", "#FirstListen", "#EarlyAccess", "#MusicDiscovery",
          "#SupportArtists", "#NewRelease", "#UndergroundMusic", "#MusicLovers", "#ExclusiveContent"
        ],
        storyOverlays: ["🔥 NEW DROP", "VAULT ONLY", "STREAM NOW"],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate captions";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
