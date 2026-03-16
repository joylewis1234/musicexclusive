import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/config/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Loader2, Volume2 } from "lucide-react";

const SFX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`;

const PRESET_PROMPTS = [
  "Epic cinematic reveal sound, deep bass impact followed by ascending sparkle tones",
  "Heavy steel bank vault door mechanism turning, metallic gears grinding, deep mechanical clicks",
  "Steel deadbolt snapping closed, heavy mechanical lock engaging, somber low tone",
  "Mystical portal opening with ethereal chimes and deep reverberating hum",
  "Dramatic orchestral hit with timpani roll and brass fanfare",
  "Dark ambient drone with distant metallic echoes and suspenseful tension",
];

export default function TestSounds() {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ prompt: string; duration: number; url: string }[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    stop();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("You must be logged in to generate sounds.");
      }

      const resp = await fetch(SFX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prompt, duration }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setPlaying(false);
      audio.play();
      setPlaying(true);

      setHistory((prev) => [{ prompt, duration, url }, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    }
  };

  const replayFromHistory = (url: string) => {
    stop();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-2">🔊 Sound Tester</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Type a sound description, generate it, and listen. When you find one you love, copy the prompt and let me know!
      </p>

      {/* Preset chips */}
      <div className="mb-4">
        <Label className="text-xs text-muted-foreground mb-2 block">Quick presets:</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPrompt(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                prompt === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {p.slice(0, 40)}…
            </button>
          ))}
        </div>
      </div>

      {/* Prompt input */}
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="prompt">Sound description</Label>
          <Input
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the sound you want..."
            className="mt-1"
          />
        </div>

        <div>
          <Label>Duration: {duration}s</Label>
          <Slider
            value={[duration]}
            onValueChange={([v]) => setDuration(v)}
            min={1}
            max={10}
            step={1}
            className="mt-2"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={generate} disabled={loading || !prompt.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate & Play
              </>
            )}
          </Button>

          {playing && (
            <Button variant="outline" onClick={stop}>
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
        </div>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Generated sounds</h2>
          <div className="space-y-2">
            {history.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <button
                  onClick={() => replayFromHistory(item.url)}
                  className="mt-0.5 shrink-0 text-primary hover:text-primary/80 transition-colors"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm leading-snug">{item.prompt}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.duration}s</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}