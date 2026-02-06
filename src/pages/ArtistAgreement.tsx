import { LegalPageLayout, LegalSection } from "@/components/legal";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadArtistAgreementPdf } from "@/utils/generateAgreementPdf";

const EFFECTIVE_DATE = "January 31, 2025";

const ArtistAgreement = () => {

  return (
    <LegalPageLayout
      title="Artist Participation Agreement"
      effectiveDate={EFFECTIVE_DATE}
      summary="This Agreement governs your participation as an artist on Music Exclusive. It covers content uploads, revenue sharing (50/50 split), exclusivity windows, and payout schedules."
    >
      {/* Download Button */}
      <div className="mb-6 flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={downloadArtistAgreementPdf}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      <LegalSection number="01" title="Introduction">
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

      <LegalSection number="02" title="Platform Purpose">
        <p>
          Music Exclusive is an artist-first music streaming and fan engagement platform 
          where artists release exclusive music to fans before releasing to other digital 
          streaming platforms.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Definitions">
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

      <LegalSection number="04" title="Artist Eligibility">
        <p>
          Company may approve or deny Artist participation at its sole discretion. Company 
          may remove Artist access for violations of this Agreement, fraud, or abuse.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Exclusivity Window">
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

      <LegalSection number="06" title="Rights Granted">
        <p>
          Artist grants Company a non-exclusive, worldwide right to host, store, stream, 
          display, and promote the Content solely in connection with operating and marketing 
          the Music Exclusive platform.
        </p>
        <p className="font-medium text-foreground">
          Artist retains ownership of all intellectual property rights in the Content.
        </p>
      </LegalSection>

      <LegalSection number="07" title="Artist Representations & Warranties">
        <p>Artist represents and warrants:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Artist owns or controls all necessary rights to upload and monetize the Content</li>
          <li>The Content does not infringe any third-party rights</li>
          <li>Artist is responsible for any third-party royalty obligations (including publishers, writers, producers, or other rights holders)</li>
          <li>Artist will not upload unlawful, infringing, or improper content</li>
        </ul>
      </LegalSection>

      <LegalSection number="08" title="Streaming Payments & Earnings">
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

      <LegalSection number="09" title="Payout Schedule">
        <p>
          Artist payouts are issued <strong>weekly on Mondays</strong> for verified streams 
          earned during the prior week.
        </p>
        <p>
          Company may delay payouts if fraud, streaming manipulation, chargebacks, or 
          disputes are suspected.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Weekly Transparency Report">
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

      <LegalSection number="11" title="Fraud, Streaming Manipulation & Termination">
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

      <LegalSection number="12" title="Termination">
        <p>
          Company may terminate this Agreement and remove Artist access at any time for 
          breach, fraud, abuse, or platform safety reasons.
        </p>
      </LegalSection>

      <LegalSection number="13" title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Company is not liable for indirect, 
          incidental, or consequential damages arising from the Services.
        </p>
      </LegalSection>

      <LegalSection number="14" title="Dispute Resolution" showDivider={false}>
        <p>
          Disputes shall be governed by applicable arbitration and dispute resolution terms 
          consistent with the Company Terms of Use.
        </p>
      </LegalSection>

      <div className="mt-10 pt-6 border-t border-border/30">
        <p className="text-sm text-muted-foreground text-center">
          By using Music Exclusive as an Artist, you agree to this Agreement.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default ArtistAgreement;
