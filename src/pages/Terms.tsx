import { LegalPageLayout, LegalSection } from "@/components/legal";

const EFFECTIVE_DATE = "January 31, 2025";

const Terms = () => {
  return (
    <LegalPageLayout
      title="Terms of Use"
      effectiveDate={EFFECTIVE_DATE}
      summary="These Terms govern your use of Music Exclusive. By accessing our platform, you agree to be bound by these terms, including our payment policies, content rules, and dispute resolution procedures."
    >
      <LegalSection number="01" title="Introduction">
        <p>
          These Terms of Use (the "Terms") apply to all users, including artists and fans, 
          who access or use the Music Exclusive website, web services, streaming services, 
          and any other services (collectively, the "Services") offered by Music Exclusive 
          ("Company," "we," or "us").
        </p>
        <p>
          Artist-specific terms may also be governed separately by the Artist Participation 
          Agreement; however, all users must comply with these Terms.
        </p>
        <p className="font-medium text-foreground">
          These Terms constitute a binding agreement between you and Company. If you do not 
          agree to these Terms, do not access or use the Services.
        </p>
      </LegalSection>

      <LegalSection number="02" title="About Music Exclusive">
        <p>
          Music Exclusive is an artist-first music streaming and fan engagement platform 
          built on fairness, exclusivity, and transparency. Our goal is to ensure that 
          every stream counts and every fan matters.
        </p>
        <p>
          Music Exclusive uses the Vault Lottery System to provide unique access for fans 
          and promote authentic discovery. We may use technology tools designed to help 
          prevent fraud, detect fake engagement, and support artists through real fan 
          activity rather than paid advertising.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Our Services">
        <p>
          <strong>3.1 Content</strong>
        </p>
        <p>
          "Content" means any copyrightable material you provide, upload, or otherwise make 
          available to us through the Services, including but not limited to sound recordings, 
          musical compositions, photos/images, videos, artwork, and cover art.
        </p>
        <p>
          We offer the Services for Content you upload, subject to these Terms and at our 
          sole discretion.
        </p>
      </LegalSection>

      <LegalSection number="04" title="Grant of Rights to Content">
        <p>
          By uploading Content, you grant Company a non-exclusive right to host, store, 
          distribute, stream, and display your Content through the Services for the purpose 
          of operating Music Exclusive. This includes the right to display cover art, artist 
          name, and related metadata, and to promote Content within the platform.
        </p>
        <p>
          <strong>4.1 Name and Likeness</strong>
        </p>
        <p>
          You grant Company the right to use your approved name, image, biography, and 
          likeness as necessary to display and promote your Content within Music Exclusive.
        </p>
        <p>
          <strong>4.2 Rights You Retain</strong>
        </p>
        <p>
          You retain all rights, title, and interest in your Content, including all 
          intellectual property rights. Nothing in these Terms transfers ownership of 
          your Content to Company.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Termination of Access">
        <p>
          We reserve the right to suspend or terminate your access to the Services at any 
          time if we believe you violated these Terms or engaged in misconduct, including 
          but not limited to streaming manipulation, fraudulent activity, uploading 
          infringing or unlawful Content, or abuse of the platform.
        </p>
        <p>
          You may stop using the Services at any time.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Payments, Credits, and Streaming Costs">
        <p>
          Music Exclusive currently offers two fan payment options:
        </p>
        <p className="mt-4">
          <strong>6.1 Pay-As-You-Go (Credits)</strong>
        </p>
        <p>
          Fans may purchase credits and use credits to stream Content.
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>1 credit = $0.20</li>
          <li>Each stream costs 1 credit ($0.20) unless otherwise stated</li>
          <li>
            Fans must maintain a minimum Pay-As-You-Go balance of $5.00 to remain active 
            on the platform. If a fan's balance drops below $5.00, access may be paused 
            until the balance is replenished.
          </li>
        </ul>
        <p className="mt-4">
          <strong>6.2 Superfan Membership</strong>
        </p>
        <p>
          Fans may subscribe to the Superfan Membership:
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>$5.00 per month</li>
          <li>Includes 25 credits added to the fan's streaming balance each month</li>
          <li>Streams reset monthly and do not roll over unless explicitly stated</li>
          <li>Streams are consumed when the fan streams Content</li>
        </ul>
        <p className="mt-3">
          Company may update pricing or benefits in the future with notice.
        </p>
      </LegalSection>

      <LegalSection number="07" title="No Refunds Policy">
        <p>
          All payments are final. No refunds are issued once credits are purchased, a 
          subscription is billed, or a stream has been completed, except where required 
          by applicable law.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Vault Access System">
        <p>
          Music Exclusive uses the Vault Access System to grant fan access 
          to the platform. Instead of open sign-ups, fans may enter the Vault for a 
          chance to gain access. Some fans may receive bypass access through approved 
          methods such as Superfan Membership access or platform-issued promotions.
        </p>
        <p>
          Access mechanics may change over time and are not fully disclosed. Company 
          may remove access for abuse, fraud, or violations of these Terms.
        </p>
      </LegalSection>

      <LegalSection number="08A" title="Content Protection & Watermarking">
        <p>
          To protect artist releases and platform access, Music Exclusive may use account-linked
          watermarking, gated playback, tokenized delivery, and other technical controls on
          streams and downloadable materials made available through the Services.
        </p>
        <p>
          You may not record, rip, capture, redistribute, restream, publicly post, or otherwise
          share Vault-only content, stream files, access credentials, or any watermark-protected
          material without express written permission from the applicable rights holder and Company.
        </p>
        <p>
          Violations may result in immediate suspension or termination of access, removal from
          the Vault, loss of credits or subscription benefits, and any other remedies available
          under these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection number="09" title="User Responsibilities">
        <p>
          You agree that you will provide accurate information, keep your login credentials 
          secure, not share your account access, and use the Services lawfully and respectfully.
        </p>
        <p className="mt-4">
          <strong>9.1 Content Upload Responsibilities (Artists)</strong>
        </p>
        <p>
          Artists agree they own or control the rights to the Content they upload and that 
          Content does not infringe third-party rights.
        </p>
        <p>
          You are solely responsible for maintaining backups of your Content.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Prohibited Activity">
        <p>
          You may not use the Services to commit fraud or streaming manipulation, harass 
          or impersonate others, upload illegal or infringing Content, attempt to reverse 
          engineer the platform, or use bots/scripts/automation to abuse platform features.
        </p>
        <p>
          You also may not capture, rip, record, leak, or redistribute watermark-protected
          Vault content or otherwise interfere with the platform's content-protection controls.
        </p>
      </LegalSection>

      <LegalSection number="11" title="Streaming Manipulation & Improper Content">
        <p>
          <strong>11.1 Streaming Manipulation</strong>
        </p>
        <p>
          "Streaming Manipulation" includes any activity that artificially inflates streams 
          or engagement and does not reflect real fan listening. If we detect or suspect 
          streaming manipulation, we may remove Content, suspend or terminate accounts, 
          and withhold or reverse earnings tied to manipulation.
        </p>
        <p className="mt-4">
          <strong>11.2 Improper Content</strong>
        </p>
        <p>
          "Improper Content" includes Content that violates laws, infringes intellectual 
          property, or harms the platform, users, or Company's reputation. We reserve the 
          right to remove Improper Content at any time.
        </p>
      </LegalSection>

      <LegalSection number="12" title="AI and Platform Improvement">
        <p>
          Music Exclusive may use analytics and engagement data to improve the user experience, 
          platform performance, and discovery tools. We do not use user-uploaded music Content 
          to train public generative AI models.
        </p>
      </LegalSection>

      <LegalSection number="13" title="Copyright Complaints (DMCA)">
        <p>
          If you believe Content on Music Exclusive infringes your copyright, submit a 
          DMCA request to:
        </p>
        <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border/50 text-sm">
          <p className="font-medium text-foreground">Delgado Entertainment Law PLLC</p>
          <p>Attn: Guyliana Plantain</p>
          <p>3295 North Drinkwater Blvd., Suite 9</p>
          <p>Scottsdale, Arizona 85251</p>
          <p className="mt-2">
            <a href="mailto:Gigi@delgadoentertainmentlaw.com" className="text-primary hover:underline">
              Gigi@delgadoentertainmentlaw.com
            </a>
          </p>
          <p className="text-muted-foreground mt-1">Subject Line: DMCA Takedown Request</p>
        </div>
      </LegalSection>

      <LegalSection number="14" title="Limitation of Liability">
        <p>
          To the maximum extent allowed by law, Company is not liable for indirect, incidental, 
          special, consequential, or punitive damages arising out of your use of the Services.
        </p>
      </LegalSection>

      <LegalSection number="15" title="Dispute Resolution & Arbitration">
        <p>
          Any dispute arising out of or relating to these Terms will be resolved through 
          binding arbitration unless prohibited by law. You waive the right to a jury trial.
        </p>
      </LegalSection>

      <LegalSection number="16" title="Miscellaneous">
        <ul className="list-disc list-outside ml-5 space-y-2">
          <li><strong>Taxes:</strong> You are responsible for any taxes you owe.</li>
          <li><strong>Severability:</strong> If any part of these Terms is invalid, the rest remains enforceable.</li>
          <li><strong>Amendments:</strong> We may update these Terms at any time.</li>
          <li><strong>Assignment:</strong> Company may assign these Terms; users may not assign without written consent.</li>
        </ul>
      </LegalSection>

      <LegalSection number="17" title="Intellectual Property Notice" showDivider={false}>
        <p>
          Music Exclusive™ is patent pending. The platform experience, systems, and exclusive 
          access flow are protected under pending patent applications. All rights are reserved.
        </p>
      </LegalSection>

      <div className="mt-10 pt-6 border-t border-border/30">
        <p className="text-sm text-muted-foreground text-center">
          By using Music Exclusive, you agree to these Terms of Use.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default Terms;
