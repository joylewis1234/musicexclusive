import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Download } from "lucide-react";

const TERMS_VERSION = "1.0";
const EFFECTIVE_DATE = "January 31, 2025";

const ARTIST_PARTICIPATION_AGREEMENT = `MUSIC EXCLUSIVE
ARTIST PARTICIPATION AGREEMENT

Effective Date: ${EFFECTIVE_DATE}
Version: ${TERMS_VERSION}

This Artist Participation Agreement ("Agreement") is entered into between Music Exclusive ("Company," "Platform," "we," or "us") and the artist ("Artist," "you," or "your") who submits Content for distribution through the Music Exclusive platform.

By uploading Content or using the Platform, you agree to be bound by this Agreement. If you do not agree to these terms, do not use the Platform.

1. ABOUT MUSIC EXCLUSIVE

Music Exclusive is an artist-first music streaming and fan engagement platform built on fairness, exclusivity, and transparency. Our goal is to ensure that every stream counts and every fan matters.

2. ELIGIBILITY

To participate as an Artist on Music Exclusive, you must:
• Be at least 18 years old or the age of majority in your jurisdiction
• Own or control all rights to the Content you upload
• Have the legal authority to enter into this Agreement

3. CONTENT SUBMISSION

3.1 Definition of Content

"Content" means any copyrightable material you provide, upload, or otherwise make available through the Platform, including but not limited to sound recordings, musical compositions, photos/images, artwork, and cover art.

3.2 Rights You Grant

By uploading Content, you grant Company a non-exclusive right to host, store, distribute, stream, and display your Content through the Platform for the purpose of operating Music Exclusive. This includes the right to display cover art, artist name, and related metadata.

3.3 Rights You Retain

You retain all rights, title, and interest in your Content, including all intellectual property rights. Nothing in this Agreement transfers ownership of your Content to Company.

3.4 Representations and Warranties

By uploading Content, you represent and warrant that:
• You own or control all rights to the Content
• The Content does not infringe any third-party rights
• The Content has not been released publicly elsewhere OR you have the right to release it on Music Exclusive
• You have obtained all necessary permissions, licenses, and clearances

4. EXCLUSIVITY WINDOW

4.1 Three-Week Exclusive Release Window

All Content uploaded to Music Exclusive is subject to a three (3) week exclusive release window, beginning from the date the Content is published on the Platform.

During this exclusivity period, you agree NOT to distribute or make available the same Content on any other streaming platform, download service, or public distribution channel.

4.2 Post-Exclusivity Rights

After the 3-week exclusivity window ends:
• You may distribute the Content elsewhere as you see fit
• Music Exclusive retains the non-exclusive right to continue streaming the Content indefinitely
• Fans who previously accessed the Content may continue to stream it

5. STREAMING COMPENSATION

5.1 Stream Pricing

Each verified stream on Music Exclusive costs the fan 1 credit (1 credit = $0.20 USD).

5.2 Revenue Split

The $0.20 per stream is split 50/50:
• $0.10 credited to the Artist
• $0.10 credited to Music Exclusive (platform)

5.3 Real-Time Earnings Tracking

Earnings accumulate in your Artist Dashboard in real time as fans stream your Content. You can monitor:
• Total verified streams
• Gross earnings
• Platform share
• Your net payout amount

6. PAYOUT SCHEDULE

6.1 Weekly Payouts

Artist payouts are issued weekly on Mondays via Stripe Connect.

6.2 Weekly Reporting

Your Artist Dashboard includes weekly payout reporting showing:
• Total verified streams for the week
• Total gross earnings
• Platform share deducted
• Your artist payout amount
• Payout status (pending, processing, paid)

6.3 Payout Requirements

To receive payouts, you must:
• Complete Stripe Connect onboarding
• Provide valid banking and identity verification
• Meet minimum payout thresholds as determined by Stripe

6.4 Payout Failures

If a payout fails due to incomplete Stripe setup or banking issues, the payout will be marked for retry. Failed payouts do not affect other artists or future earning accumulation.

7. STREAMING MANIPULATION

7.1 Definition

"Streaming Manipulation" includes any activity that artificially inflates streams or engagement and does not reflect real fan listening, including but not limited to:
• Using bots, scripts, or automated tools
• Creating fake accounts to stream your own Content
• Paying for artificial streams or engagement
• Coordinating with others to manipulate stream counts

7.2 Consequences

If we detect or suspect streaming manipulation, we may:
• Remove affected Content
• Suspend or terminate your account
• Withhold or reverse earnings tied to manipulation
• Pursue legal remedies as appropriate

8. CONTENT REMOVAL

8.1 Your Right to Remove

You may request removal of your Content at any time by contacting us through the Platform. Removal will be processed within a reasonable timeframe.

8.2 Our Right to Remove

We reserve the right to remove Content at any time if we believe it:
• Violates this Agreement or our Terms of Use
• Infringes third-party rights
• Contains illegal or harmful material
• Is subject to a valid DMCA takedown request

9. TERMINATION

9.1 By Artist

You may stop using the Platform and terminate this Agreement at any time by removing your Content and closing your account.

9.2 By Company

We reserve the right to suspend or terminate your access to the Platform if you violate this Agreement, engage in streaming manipulation, or for any other reason at our sole discretion.

9.3 Effect of Termination

Upon termination:
• You will receive any outstanding earnings that are due
• Content previously streamed may remain accessible to fans who previously accessed it
• You agree to cease using the Platform

10. LIMITATION OF LIABILITY

To the maximum extent allowed by law, Company is not liable for indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform or this Agreement.

The Platform is provided "as is" without warranties of any kind.

11. DISPUTE RESOLUTION

Any dispute arising out of or relating to this Agreement will be resolved through binding arbitration unless prohibited by law. You waive the right to a jury trial.

12. MISCELLANEOUS

12.1 Taxes

You are solely responsible for any taxes you owe on earnings received through the Platform.

12.2 Independent Contractor

You are an independent contractor, not an employee, partner, or agent of Company.

12.3 Severability

If any part of this Agreement is found invalid, the remainder continues in effect.

12.4 Amendments

We may update this Agreement at any time. Continued use of the Platform after changes are posted constitutes acceptance.

12.5 Assignment

Company may assign this Agreement. You may not assign without written consent.

13. CONTACT

For questions about this Agreement, please contact us through the Platform.

By using Music Exclusive as an Artist, you acknowledge that you have read, understood, and agree to be bound by this Artist Participation Agreement.`;

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
