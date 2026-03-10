const AgreementTextContent = () => (
  <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">01 — Introduction</h3>
      <p>
        This Artist Participation Agreement ("Agreement") is entered into between Music 
        Exclusive ("Company," "we," or "us") and you ("Artist," "you," or "your"). This 
        Agreement governs your participation as an artist on the Music Exclusive platform 
        ("Services").
      </p>
      <p className="mt-2 font-medium text-foreground">
        By accessing the Services, uploading Content, or clicking "I Agree," you confirm 
        you have read, understood, and agree to be bound by this Agreement.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">02 — Platform Purpose</h3>
      <p>
        Music Exclusive is an artist-first music streaming and fan engagement platform 
        where artists release exclusive music to fans before releasing to other digital 
        streaming platforms.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">03 — Definitions</h3>
      <ul className="list-disc list-outside ml-5 space-y-2">
        <li><strong>"Content"</strong> means the sound recordings, compositions, cover art, images, metadata, and other materials you upload to Music Exclusive.</li>
        <li><strong>"Verified Stream"</strong> means a legitimate fan-initiated stream that meets platform validation requirements and is not fraudulent or manipulated.</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">04 — Artist Eligibility</h3>
      <p>
        Company may approve or deny Artist participation at its sole discretion. Company 
        may remove Artist access for violations of this Agreement, fraud, or abuse.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">05 — Exclusivity Window</h3>
      <p>
        Artist agrees that each uploaded release may be exclusive to Music Exclusive for 
        a minimum of <strong>three (3) weeks</strong> (or longer if Artist chooses).
      </p>
      <p className="mt-2">
        After the exclusivity period, Artist may distribute the release elsewhere. Music 
        Exclusive retains the right to continue streaming the Content on the platform 
        indefinitely unless otherwise agreed in writing.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">06 — Rights Granted</h3>
      <p>
        Artist grants Company a non-exclusive, worldwide right to host, store, stream, 
        display, and promote the Content solely in connection with operating and marketing 
        the Music Exclusive platform.
      </p>
      <p className="mt-2 font-medium text-foreground">
        Artist retains ownership of all intellectual property rights in the Content.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">07 — Artist Representations & Warranties</h3>
      <p>Artist represents and warrants:</p>
      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
        <li>Artist owns or controls all necessary rights to upload and monetize the Content</li>
        <li>The Content does not infringe any third-party rights</li>
        <li>Artist is responsible for any third-party royalty obligations</li>
        <li>Artist will not upload unlawful, infringing, or improper content</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">08 — Streaming Payments & Earnings</h3>
      <p>Fans stream music using credits.</p>
      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
        <li>1 credit = $0.20</li>
        <li>Each stream costs 1 credit ($0.20)</li>
      </ul>
      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="font-semibold text-foreground mb-1">Revenue Split:</p>
        <ul className="list-disc list-outside ml-5 space-y-1">
          <li><strong>50% to Artist</strong> ($0.10 per stream)</li>
          <li><strong>50% to Music Exclusive</strong> ($0.10 per stream)</li>
        </ul>
      </div>
      <p className="mt-2">Artist earnings will be tracked inside the Artist Dashboard.</p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">09 — Payout Schedule</h3>
      <p>
        Artist payouts are issued <strong>weekly on Mondays</strong> for verified streams 
        earned during the prior week.
      </p>
      <p className="mt-2">
        Company may delay payouts if fraud, streaming manipulation, chargebacks, or 
        disputes are suspected.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">10 — Weekly Transparency Report</h3>
      <p>Company will provide a weekly transparency report inside the Artist Earnings page showing:</p>
      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
        <li>Total verified streams</li>
        <li>Total credits collected</li>
        <li>Artist share</li>
        <li>Platform share</li>
        <li>Payout status (Pending/Paid)</li>
        <li>Total payouts (lifetime)</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">11 — Fraud, Streaming Manipulation & Termination</h3>
      <p>Artist may not engage in streaming manipulation or artificial inflation of streams.</p>
      <p className="mt-2">If Company determines manipulation occurred, Company may:</p>
      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
        <li>Remove Content</li>
        <li>Suspend or terminate Artist access</li>
        <li>Withhold earnings tied to manipulation</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">12 — Termination</h3>
      <p>
        Company may terminate this Agreement and remove Artist access at any time for 
        breach, fraud, abuse, or platform safety reasons.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">13 — Limitation of Liability</h3>
      <p>
        To the maximum extent permitted by law, Company is not liable for indirect, 
        incidental, or consequential damages arising from the Services.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">14 — Dispute Resolution</h3>
      <p>
        Disputes shall be governed by applicable arbitration and dispute resolution terms 
        consistent with the Company Terms of Use.
      </p>
    </section>

    <div className="pt-4 border-t border-border/30">
      <p className="text-xs text-muted-foreground text-center">
        By using Music Exclusive as an Artist, you agree to this Agreement.
      </p>
    </div>
  </div>
);

export default AgreementTextContent;
