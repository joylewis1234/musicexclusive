import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const RANK_BORDER: Record<number, string> = {
  1: "border-l-[3px] border-l-amber-400",
  2: "border-l-[3px] border-l-slate-400",
  3: "border-l-[3px] border-l-amber-600",
};

const GHOST_ROWS = [
  { rank: 1, icon: "🏆", border: "border-l-amber-400" },
  { rank: 2, icon: "··", border: "border-l-slate-400" },
  { rank: 3, icon: "··", border: "border-l-amber-600" },
];

const ChartsPage = () => {
  const navigate = useNavigate();
  const [activeGenre, setActiveGenre] = useState<string>(CHART_GENRES[0].slug);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["charts", activeGenre, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_public_charts", { p_genre: activeGenre, p_year: currentYear });

      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        artist_id: row.artist_id,
        cumulative_streams: row.cumulative_streams,
        rank: row.rank,
        prize_usd: row.prize_usd,
        status: row.status,
        artist_profiles: {
          artist_name: row.artist_name,
          country_code: row.country_code,
        },
      })) as ChartRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = [
    { label: "Genres", value: CHART_GENRES.length },
    { label: "Top Prize", value: "$500" },
    { label: "Days Until Reset", value: daysUntilReset },
    { label: "Artists Charting", value: entries?.length ?? "—" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-20 pb-16 px-4">
        <div className="container max-w-4xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="pt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {currentYear} Season
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Exclusive Charts
            </h1>
            <div className="h-px w-full bg-amber-500/50" />
            <p className="text-sm text-muted-foreground">
              The top-streaming artists on Music Exclusive, ranked by genre. Updated nightly.
            </p>
          </div>

          {/* ── Stat Bar ── */}
          <div className="flex items-stretch bg-card border border-border rounded-lg overflow-hidden">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`flex-1 px-4 py-3 text-center ${i < stats.length - 1 ? "border-r border-border" : ""}`}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  {s.label}
                </p>
                <p className="text-base font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Callout Bar ── */}
          <div className="border-l-4 border-l-amber-400 bg-card rounded-r-lg px-4 py-3">
            <p className="text-sm text-foreground">
              Artists earn <strong>$0.10 per stream</strong>. Top artists earn cash prizes. Every stream counts.
            </p>
          </div>

          {/* ── Genre Tabs ── */}
          <div className="overflow-x-auto scrollbar-hide border-b border-border">
            <div className="flex gap-0 min-w-max">
              {CHART_GENRES.map((g) => {
                const isActive = activeGenre === g.slug;
                return (
                  <button
                    key={g.slug}
                    onClick={() => setActiveGenre(g.slug)}
                    className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? "text-foreground font-bold border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Chart Content ── */}
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded" />
              ))}
            </div>
          ) : !entries || entries.length === 0 ? (
            /* ── Empty State ── */
            <div className="space-y-6">
              <div className="divide-y divide-border/30 opacity-40 blur-[1px] select-none">
                {GHOST_ROWS.map((g) => (
                  <div
                    key={g.rank}
                    className={`flex items-center gap-4 px-4 py-4 border-l-[3px] ${g.border}`}
                  >
                    <span className="w-12 text-lg font-bold text-muted-foreground">#{g.rank}</span>
                    <span className="text-lg">{g.icon}</span>
                    <span className="text-sm font-medium text-muted-foreground">First to Qualify</span>
                  </div>
                ))}
              </div>
              <div className="text-center space-y-2 pt-2">
                <p className="text-muted-foreground">
                  No artists have qualified in <strong>{activeGenre}</strong> yet this season.
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Be the first — 10,000 streams unlocks your spot on the charts.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1 border-primary text-primary hover:bg-primary/10"
                  onClick={() => navigate("/artist/application-form")}
                >
                  Become an Artist <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* ── Populated Rows ── */
            <div className="divide-y divide-border/30">
              {entries.map((entry, idx) => {
                const displayRank = entry.rank ?? idx + 1;
                const prizeConfig = entry.rank ? PRIZE_CONFIG[entry.rank] : null;
                const borderClass = entry.rank && RANK_BORDER[entry.rank] ? RANK_BORDER[entry.rank] : "border-l-[3px] border-l-transparent";

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] ${borderClass}`}
                  >
                    <span className="w-12 text-lg font-bold text-muted-foreground shrink-0">
                      #{displayRank}
                    </span>

                    <span className="text-lg shrink-0">
                      {countryCodeToFlag(entry.artist_profiles.country_code)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {entry.artist_profiles.artist_name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {entry.cumulative_streams.toLocaleString()}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        streams
                      </p>
                    </div>

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
          )}

          {/* ── Footer Note ── */}
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
