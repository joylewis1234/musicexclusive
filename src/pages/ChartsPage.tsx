import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Music, Globe, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const CHART_GENRES = [
  { label: "Pop", slug: "Pop" },
  { label: "Hip-Hop", slug: "Hip-Hop" },
  { label: "Latin", slug: "Latin" },
  { label: "Country", slug: "Country" },
  { label: "Electronic", slug: "Electronic" },
  { label: "Rock", slug: "Rock" },
  { label: "R&B", slug: "R&B" },
  { label: "Indie", slug: "Indie" },
  { label: "Jazz", slug: "Jazz" },
  { label: "Lo-Fi", slug: "Lo-Fi" },
] as const;

function countryCodeToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

const currentYear = new Date().getUTCFullYear();
const daysUntilReset = Math.ceil(
  (new Date(`${currentYear + 1}-01-01`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
);

interface ChartRow {
  id: string;
  artist_id: string;
  cumulative_streams: number;
  rank: number | null;
  prize_usd: number | null;
  status: string;
  artist_profiles: {
    artist_name: string;
    country_code: string | null;
  };
}

const PRIZE_CONFIG: Record<number, { amount: number; color: string; bg: string }> = {
  1: { amount: 500, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  2: { amount: 250, color: "text-slate-300", bg: "bg-slate-400/10 border-slate-400/30" },
  3: { amount: 100, color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/30" },
};

const ChartsPage = () => {
  const navigate = useNavigate();
  const [activeGenre, setActiveGenre] = useState(CHART_GENRES[0].slug);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["charts", activeGenre, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charts_bonus_cycles")
        .select("id, artist_id, cumulative_streams, rank, prize_usd, status, artist_profiles!inner(artist_name, country_code)")
        .eq("genre", activeGenre)
        .eq("cycle_year", currentYear)
        .neq("status", "disqualified")
        .order("cumulative_streams", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ChartRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-20 pb-16 px-4">
        <div className="container max-w-4xl mx-auto space-y-8">
          {/* Hero */}
          <div className="text-center space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {currentYear} Season
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Exclusive Charts
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              The top-streaming artists on Music Exclusive, ranked by genre. Updated nightly.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GlowCard className="p-4 text-center">
              <Music className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-xl font-bold text-foreground">{CHART_GENRES.length}</p>
              <p className="text-xs text-muted-foreground">Genres</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <Trophy className="w-5 h-5 mx-auto text-amber-400 mb-1" />
              <p className="text-xl font-bold text-foreground">$500</p>
              <p className="text-xs text-muted-foreground">Top Prize / Genre</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <Globe className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
              <p className="text-xl font-bold text-foreground">{entries?.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Artists Charting</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-xl font-bold text-foreground">{daysUntilReset}</p>
              <p className="text-xs text-muted-foreground">Days Until Reset</p>
            </GlowCard>
          </div>

          {/* Gold Banner */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center">
            <p className="text-sm text-amber-300/90">
              Artists earn <strong>$0.10 per stream</strong>. Top artists earn cash prizes. Every stream counts.
            </p>
          </div>

          {/* Genre Tabs */}
          <Tabs value={activeGenre} onValueChange={setActiveGenre} className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/30 p-1.5 rounded-lg">
              {CHART_GENRES.map((g) => (
                <TabsTrigger
                  key={g.slug}
                  value={g.slug}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CHART_GENRES.map((g) => (
              <TabsContent key={g.slug} value={g.slug} className="mt-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : !entries || entries.length === 0 ? (
                  <GlowCard className="p-8 text-center space-y-3">
                    <Globe className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">
                      No artists have qualified in <strong>{g.label}</strong> yet this season.
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Be the first — 10,000 streams unlocks your spot on the charts.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1"
                      onClick={() => navigate("/artist/application-form")}
                    >
                      Become an Artist <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </GlowCard>
                ) : (
                  <GlowCard className="overflow-hidden">
                    <div className="divide-y divide-border/20">
                      {entries.map((entry, idx) => {
                        const displayRank = entry.rank ?? idx + 1;
                        const prizeConfig = entry.rank ? PRIZE_CONFIG[entry.rank] : null;

                        return (
                          <div
                            key={entry.id}
                            className={`flex items-center gap-3 md:gap-4 px-4 py-3 transition-colors ${
                              prizeConfig ? prizeConfig.bg : ""
                            }`}
                          >
                            {/* Rank */}
                            <div className="w-8 text-center shrink-0">
                              {entry.rank && entry.rank <= 3 ? (
                                <span className={`text-lg font-bold ${prizeConfig?.color}`}>
                                  {entry.rank === 1 && <Trophy className="w-5 h-5 inline text-amber-400" />}
                                  {entry.rank !== 1 && `#${displayRank}`}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">{displayRank}</span>
                              )}
                            </div>

                            {/* Flag */}
                            <span className="text-lg shrink-0">
                              {countryCodeToFlag(entry.artist_profiles.country_code)}
                            </span>

                            {/* Artist Name */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {entry.artist_profiles.artist_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.cumulative_streams.toLocaleString()} streams
                              </p>
                            </div>

                            {/* Prize Badge */}
                            {prizeConfig && (
                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold shrink-0 ${prizeConfig.color} border-current/30`}
                              >
                                ${prizeConfig.amount}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlowCard>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Footer Note */}
          <div className="text-center space-y-1 pt-4">
            <p className="text-xs text-muted-foreground/60">
              Chart eligibility requires completion of the Cash Bonus Program.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Rankings reflect verified streams only. Prizes paid annually.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Questions? support@musicexclusive.co
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ChartsPage;
