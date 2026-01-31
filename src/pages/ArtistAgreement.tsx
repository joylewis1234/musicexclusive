import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Download } from "lucide-react";

const TERMS_VERSION = "1.0";
const EFFECTIVE_DATE = "January 31, 2025";

const ARTIST_PARTICIPATION_AGREEMENT = `MUSIC EXCLUSIVE
ARTIST PARTICIPATION AGREEMENT (MVP VERSION)

Effective Date: ${EFFECTIVE_DATE}

This Artist Participation Agreement ("Agreement") is entered into between Music Exclusive ("Company," "we," or "us") and you ("Artist," "you," or "your"). This Agreement governs your participation as an artist on the Music Exclusive platform ("Services").

By accessing the Services, uploading Content, or clicking "I Agree," you confirm you have read, understood, and agree to be bound by this Agreement.

1. PLATFORM PURPOSE
Music Exclusive is an artist-first music streaming and fan engagement platform where artists release exclusive music to fans before releasing to other digital streaming platforms.

2. DEFINITIONS
"Content" means the sound recordings, compositions, cover art, images, metadata, and other materials you upload to Music Exclusive.
"Verified Stream" means a legitimate fan-initiated stream that meets platform validation requirements and is not fraudulent or manipulated.

3. ARTIST ELIGIBILITY
Company may approve or deny Artist participation at its sole discretion. Company may remove Artist access for violations of this Agreement, fraud, or abuse.

4. EXCLUSIVITY WINDOW
Artist agrees that each uploaded release may be exclusive to Music Exclusive for a minimum of three (3) weeks (or longer if Artist chooses).
After the exclusivity period, Artist may distribute the release elsewhere. Music Exclusive retains the right to continue streaming the Content on the platform indefinitely unless otherwise agreed in writing.

5. RIGHTS GRANTED
Artist grants Company a non-exclusive, worldwide right to host, store, stream, display, and promote the Content solely in connection with operating and marketing the Music Exclusive platform.
Artist retains ownership of all intellectual property rights in the Content.

6. ARTIST REPRESENTATIONS & WARRANTIES
Artist represents and warrants:
- Artist owns or controls all necessary rights to upload and monetize the Content
- The Content does not infringe any third-party rights
- Artist is responsible for any third-party royalty obligations (including publishers, writers, producers, or other rights holders)
- Artist will not upload unlawful, infringing, or improper content

7. STREAMING PAYMENTS & EARNINGS (MVP)
Fans stream music using credits.
- 1 credit = $0.20
- Each stream costs 1 credit ($0.20)

Revenue Split:
- 50% to Artist ($0.10 per stream)
- 50% to Music Exclusive ($0.10 per stream)

Artist earnings will be tracked inside the Artist Dashboard.

8. PAYOUT SCHEDULE
Artist payouts are issued weekly on Mondays for verified streams earned during the prior week.
Company may delay payouts if fraud, streaming manipulation, chargebacks, or disputes are suspected.

9. WEEKLY TRANSPARENCY REPORT
Company will provide a weekly transparency report inside the Artist Earnings page showing:
- Total verified streams
- Total credits collected
- Artist share
- Platform share
- Payout status (Pending/Paid)
- Total payouts (lifetime)

10. FRAUD, STREAMING MANIPULATION & TERMINATION
Artist may not engage in streaming manipulation or artificial inflation of streams.
If Company determines in its sole discretion that manipulation occurred, Company may:
- remove Content
- suspend or terminate Artist access
- withhold earnings tied to manipulation

11. TERMINATION
Company may terminate this Agreement and remove Artist access at any time for breach, fraud, abuse, or platform safety reasons.

12. LIMITATION OF LIABILITY
To the maximum extent permitted by law, Company is not liable for indirect, incidental, or consequential damages arising from the Services.

13. DISPUTE RESOLUTION
Disputes shall be governed by applicable arbitration and dispute resolution terms consistent with the Company Terms of Use.

END OF AGREEMENT`;

const ArtistAgreement = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    const blob = new Blob([ARTIST_PARTICIPATION_AGREEMENT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Music_Exclusive_Artist_Participation_Agreement_v${TERMS_VERSION}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="p-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Home</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8">
        <div className="w-full max-w-2xl">
          <GlowCard glowColor="gradient" className="p-6 md:p-8">
            {/* Title */}
            <div className="text-center mb-6">
              <p className="text-primary text-xs uppercase tracking-widest mb-2 font-display">
                Music Exclusive™
              </p>
              <SectionHeader 
                title="Artist Participation Agreement" 
                align="center" 
                framed 
              />
            </div>

            <p className="text-muted-foreground text-center mb-2 text-sm">
              Version {TERMS_VERSION} • Effective {EFFECTIVE_DATE}
            </p>

            <p className="text-muted-foreground text-center mb-6 text-xs">
              Please read this agreement carefully before uploading Content to Music Exclusive.
            </p>

            {/* Download Button */}
            <div className="flex justify-center mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download Agreement
              </Button>
            </div>

            {/* Terms Content */}
            <div className="border border-border/50 rounded-lg bg-background/50">
              <ScrollArea className="h-[55vh] p-4 md:p-6">
                <pre className="whitespace-pre-wrap text-xs md:text-sm text-muted-foreground font-body leading-relaxed select-text">
                  {ARTIST_PARTICIPATION_AGREEMENT}
                </pre>
              </ScrollArea>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-6">
              By using Music Exclusive as an Artist, you agree to this Agreement.
            </p>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default ArtistAgreement;
