import { LegalPageLayout, LegalSection } from "@/components/legal";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const TERMS_VERSION = "1.0";
const EFFECTIVE_DATE = "January 31, 2025";

const AGREEMENT_TEXT = `MUSIC EXCLUSIVE
ARTIST PARTICIPATION AGREEMENT (MVP VERSION)

Effective Date: ${EFFECTIVE_DATE}

This Artist Participation Agreement ("Agreement") is entered into between Music Exclusive ("Company," "we," or "us") and you ("Artist," "you," or "your"). This Agreement governs your participation as an artist on the Music Exclusive platform ("Services").

By accessing the Services, uploading Content, or clicking "I Agree," you confirm you have read, understood, and agree to be bound by this Agreement.`;

const ArtistAgreement = () => {
  const handleDownload = () => {
    const fullText = `MUSIC EXCLUSIVE
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
    
    const blob = new Blob([fullText], { type: "text/plain" });
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
    <LegalPageLayout
      title="Artist Participation Agreement"
      subtitle="Terms governing your participation as an artist on Music Exclusive."
      version={TERMS_VERSION}
      effectiveDate={EFFECTIVE_DATE}
    >
      {/* Download Button */}
      <div className="mb-8">
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

      <LegalSection>
        <p>
          This Artist Participation Agreement ("Agreement") is entered into between Music 
          Exclusive ("Company," "we," or "us") and you ("Artist," "you," or "your"). This 
          Agreement governs your participation as an artist on the Music Exclusive platform 
          ("Services").
        </p>
        <p className="font-medium text-foreground">
          By accessing the Services, uploading Content, or clicking "I Agree," you confirm 
          you have read, understood, and agree to be bound by this Agreement.
        </p>
      </LegalSection>

      <LegalSection title="1. Platform Purpose">
        <p>
          Music Exclusive is an artist-first music streaming and fan engagement platform 
          where artists release exclusive music to fans before releasing to other digital 
          streaming platforms.
        </p>
      </LegalSection>

      <LegalSection title="2. Definitions">
        <ul className="list-disc list-outside ml-5 space-y-2">
          <li>
            <strong>"Content"</strong> means the sound recordings, compositions, cover art, 
            images, metadata, and other materials you upload to Music Exclusive.
          </li>
          <li>
            <strong>"Verified Stream"</strong> means a legitimate fan-initiated stream that 
            meets platform validation requirements and is not fraudulent or manipulated.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Artist Eligibility">
        <p>
          Company may approve or deny Artist participation at its sole discretion. Company 
          may remove Artist access for violations of this Agreement, fraud, or abuse.
        </p>
      </LegalSection>

      <LegalSection title="4. Exclusivity Window">
        <p>
          Artist agrees that each uploaded release may be exclusive to Music Exclusive for 
          a minimum of <strong>three (3) weeks</strong> (or longer if Artist chooses).
        </p>
        <p>
          After the exclusivity period, Artist may distribute the release elsewhere. Music 
          Exclusive retains the right to continue streaming the Content on the platform 
          indefinitely unless otherwise agreed in writing.
        </p>
      </LegalSection>

      <LegalSection title="5. Rights Granted">
        <p>
          Artist grants Company a non-exclusive, worldwide right to host, store, stream, 
          display, and promote the Content solely in connection with operating and marketing 
          the Music Exclusive platform.
        </p>
        <p className="font-medium text-foreground">
          Artist retains ownership of all intellectual property rights in the Content.
        </p>
      </LegalSection>

      <LegalSection title="6. Artist Representations & Warranties">
        <p>Artist represents and warrants:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Artist owns or controls all necessary rights to upload and monetize the Content</li>
          <li>The Content does not infringe any third-party rights</li>
          <li>Artist is responsible for any third-party royalty obligations (including publishers, writers, producers, or other rights holders)</li>
          <li>Artist will not upload unlawful, infringing, or improper content</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Streaming Payments & Earnings (MVP)">
        <p>Fans stream music using credits.</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>1 credit = $0.20</li>
          <li>Each stream costs 1 credit ($0.20)</li>
        </ul>
        
        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="font-semibold text-foreground mb-2">Revenue Split:</p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li><strong>50% to Artist</strong> ($0.10 per stream)</li>
            <li><strong>50% to Music Exclusive</strong> ($0.10 per stream)</li>
          </ul>
        </div>
        
        <p className="mt-3">
          Artist earnings will be tracked inside the Artist Dashboard.
        </p>
      </LegalSection>

      <LegalSection title="8. Payout Schedule">
        <p>
          Artist payouts are issued <strong>weekly on Mondays</strong> for verified streams 
          earned during the prior week.
        </p>
        <p>
          Company may delay payouts if fraud, streaming manipulation, chargebacks, or 
          disputes are suspected.
        </p>
      </LegalSection>

      <LegalSection title="9. Weekly Transparency Report">
        <p>
          Company will provide a weekly transparency report inside the Artist Earnings page showing:
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Total verified streams</li>
          <li>Total credits collected</li>
          <li>Artist share</li>
          <li>Platform share</li>
          <li>Payout status (Pending/Paid)</li>
          <li>Total payouts (lifetime)</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Fraud, Streaming Manipulation & Termination">
        <p>
          Artist may not engage in streaming manipulation or artificial inflation of streams.
        </p>
        <p>
          If Company determines in its sole discretion that manipulation occurred, Company may:
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Remove Content</li>
          <li>Suspend or terminate Artist access</li>
          <li>Withhold earnings tied to manipulation</li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>
          Company may terminate this Agreement and remove Artist access at any time for 
          breach, fraud, abuse, or platform safety reasons.
        </p>
      </LegalSection>

      <LegalSection title="12. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Company is not liable for indirect, 
          incidental, or consequential damages arising from the Services.
        </p>
      </LegalSection>

      <LegalSection title="13. Dispute Resolution">
        <p>
          Disputes shall be governed by applicable arbitration and dispute resolution terms 
          consistent with the Company Terms of Use.
        </p>
      </LegalSection>

      <div className="mt-12 pt-6 border-t border-border/30">
        <p className="text-sm text-muted-foreground text-center">
          By using Music Exclusive as an Artist, you agree to this Agreement.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default ArtistAgreement;
