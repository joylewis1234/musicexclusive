import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const genres = ["Pop", "Hip-Hop/Rap", "R&B", "EDM", "Latin Music"] as const;

type Genre = (typeof genres)[number];

interface Row { flag: string; name: string; streams: string; }

const data: Record<Genre, Row[]> = {
  "Pop": [
    { flag: "🇺🇸", name: "Aria Nova", streams: "24,310" },
    { flag: "🇬🇧", name: "Levi Crest", streams: "21,840" },
    { flag: "🇨🇦", name: "Stella Vox", streams: "19,205" },
    { flag: "🇦🇺", name: "Juno Blake", streams: "15,890" },
    { flag: "🇩🇪", name: "Mara Wells", streams: "12,440" },
  ],
  "Hip-Hop/Rap": [
    { flag: "🇺🇸", name: "Kace Malone", streams: "31,200" },
    { flag: "🇳🇬", name: "Drex Obi", streams: "28,750" },
    { flag: "🇯🇲", name: "Yung Steele", streams: "25,100" },
    { flag: "🇺🇸", name: "Nova Blac", streams: "21,330" },
    { flag: "🇬🇧", name: "Lyric Kane", streams: "18,900" },
  ],
  "R&B": [
    { flag: "🇺🇸", name: "Zara Muse", streams: "27,650" },
    { flag: "🇯🇲", name: "Nia Solis", streams: "24,100" },
    { flag: "🇳🇬", name: "Delilah V", streams: "20,880" },
    { flag: "🇺🇸", name: "Ren Avery", streams: "17,200" },
    { flag: "🇿🇦", name: "Imani Cole", streams: "14,500" },
  ],
  "EDM": [
    { flag: "🇩🇪", name: "KRVN", streams: "29,400" },
    { flag: "🇳🇱", name: "Axel Frost", streams: "26,110" },
    { flag: "🇸🇪", name: "Pulse96", streams: "22,750" },
    { flag: "🇺🇸", name: "Nova Grid", streams: "19,300" },
    { flag: "🇫🇷", name: "Echo Lane", streams: "16,800" },
  ],
  "Latin Music": [
    { flag: "🇨🇴", name: "Mateo Rey", streams: "33,500" },
    { flag: "🇲🇽", name: "Luna Vidal", streams: "29,800" },
    { flag: "🇵🇷", name: "Cayo Reyes", streams: "26,400" },
    { flag: "🇧🇷", name: "Isa Bravo", streams: "22,100" },
    { flag: "🇩🇴", name: "Niko Cruz", streams: "18,750" },
  ],
};

const prizes = ["$500", "$250", "$100"];
const prizeBg = [
  "bg-amber-400/20 text-amber-400 border border-amber-400/30",
  "bg-slate-400/20 text-slate-400 border border-slate-400/30",
  "bg-amber-600/20 text-amber-600 border border-amber-600/30",
];
const borderColors = ["border-l-[3px] border-amber-400", "border-l-[3px] border-slate-400", "border-l-[3px] border-amber-600"];

const ChartsTeaser = () => {
  const [active, setActive] = useState<Genre>("Pop");
  const navigate = useNavigate();
  const rows = data[active];

  return (
    <section className="px-4 py-16 bg-background-elevated">
      <div className="container max-w-lg md:max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-left mb-2">
          <p className="text-primary text-xs font-display uppercase tracking-[0.3em] mb-2">Exclusive Charts</p>
          <h2 className="text-foreground font-display font-black text-2xl md:text-3xl mb-2">Who's Leading the Charts?</h2>
          <p className="text-muted-foreground text-sm font-body">
            The top-streaming independent artists on Music Exclusive, ranked by genre.
          </p>
        </div>
        <hr className="border-amber-400/40 mb-6" />

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-border mb-4">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActive(g)}
              className={`px-3 py-2 text-xs font-display uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 -mb-px ${
                active === g
                  ? "text-foreground font-bold border-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="divide-y divide-border">
          {rows.map((row, i) => (
            <div
              key={row.name}
              className={`flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] transition-colors ${i < 3 ? borderColors[i] : ""}`}
            >
              <span className="text-muted-foreground font-bold text-sm w-6 text-right">{i + 1}</span>
              <span className="text-base">{row.flag}</span>
              <span className="text-foreground font-semibold text-sm flex-1">{row.name}</span>
              <span className="text-muted-foreground text-xs">{row.streams} streams</span>
              {i < 3 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prizeBg[i]}`}>
                  {prizes[i]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Disclaimer + CTAs */}
        <p className="text-muted-foreground text-xs italic text-center mt-6 mb-4">
          Chart positions shown are illustrative. Live rankings launch with the platform.
        </p>
        <div className="flex justify-center items-center">
          <Button variant="accent" onClick={() => navigate("/artist-waitlist")}>
            Become a Charting Artist
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ChartsTeaser;
