import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const bonusData = [
  { icon: "🏆", artist: "Kairo Blaze", genre: "Afrobeats", streams: "10,000", bonus: "$125.00", quote: "Just hit 10K. Music Exclusive is the real deal.", flag: "🇳🇬", time: "2 hours ago" },
  { icon: "💰", artist: "Nova Rae", genre: "Alt Pop", streams: "2,500", bonus: "$50.00", quote: "Never made money this fast from streaming.", flag: "🇬🇧", time: "5 hours ago" },
  { icon: "🏆", artist: "Skye Monroe", genre: "R&B / Soul", streams: "5,000", bonus: "$100.00", quote: "My fans showed up and Music Exclusive paid up.", flag: "🇺🇸", time: "Yesterday" },
  { icon: "💰", artist: "Mateo Rey", genre: "Latin Music", streams: "1,000", bonus: "$25.00", quote: "First bonus hit in 3 days. I'm locked in.", flag: "🇨🇴", time: "Yesterday" },
  { icon: "🏆", artist: "Yuki Haze", genre: "Lo-Fi", streams: "10,000", bonus: "$125.00", quote: "Lo-Fi community came through. $300 total earned.", flag: "🇯🇵", time: "2 days ago" },
  { icon: "💰", artist: "Zion Cross", genre: "Hip-Hop", streams: "2,500", bonus: "$50.00", quote: "Independent forever. Getting paid like it too.", flag: "🇯🇲", time: "2 days ago" },
  { icon: "🏆", artist: "Imani Cole", genre: "Afrobeats / Soul", streams: "5,000", bonus: "$100.00", quote: "My supporters made this happen. Thank you.", flag: "🇿🇦", time: "3 days ago" },
  { icon: "💰", artist: "Luna Vidal", genre: "Latin Pop", streams: "1,000", bonus: "$25.00", quote: "Day one on the platform. Already earning.", flag: "🇲🇽", time: "3 days ago" },
];

const CashBonusFeed = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-16">
      <div className="container max-w-lg md:max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-left mb-2">
          <p className="text-primary text-xs font-display uppercase tracking-[0.3em] mb-2">Artist Earnings</p>
          <h2 className="text-foreground font-display font-black text-2xl md:text-3xl mb-2">Artists Are Getting Paid.</h2>
          <p className="text-muted-foreground text-sm font-body">
            Every stream pays. Every milestone earns a cash bonus. This is what that looks like.
          </p>
        </div>
        <hr className="border-amber-400/40 mb-8" />

        {/* Feed */}
        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto scrollbar-hide">
          {bonusData.map((item, i) => (
            <div key={i} className="bg-card rounded-lg border-l-2 border-amber-400 p-4 flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                {item.icon}
              </div>

              {/* Center */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-foreground font-semibold text-sm">{item.artist}</span>
                  <span className="text-muted-foreground text-xs">{item.genre}</span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">Reached {item.streams} streams</p>
                <p className="text-xs mt-0.5">
                  <span className="text-muted-foreground">Bonus Paid: </span>
                  <span className="font-bold text-amber-400">{item.bonus}</span>
                </p>
                <p className="text-primary/70 text-xs italic mt-1">"{item.quote}"</p>
              </div>

              {/* Right */}
              <div className="flex-shrink-0 flex flex-col items-center gap-0.5 text-center">
                <span className="text-base leading-none">{item.flag}</span>
                <span className="text-muted-foreground text-[10px]">{item.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer + CTA */}
        <p className="text-muted-foreground text-xs italic text-center mt-6 mb-4">
          Earnings shown are illustrative of platform potential. Actual earnings depend on stream volume.
        </p>
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full border-primary text-primary" onClick={() => navigate("/artist-benefits")}>
            See How Artist Earnings Work
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CashBonusFeed;
