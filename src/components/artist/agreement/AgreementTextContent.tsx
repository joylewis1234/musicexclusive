const AgreementTextContent = () => (
  <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">01 — Introduction</h3>
      <p>
        This Artist Participation Agreement ("Agreement") is entered into between Music
        Exclusive LLC ("Company," "we," or "us") and you ("Artist," "you," or "your").
        This Agreement governs your participation as an artist on the Music Exclusive
        platform at themusicexclusive.com ("Platform"). By uploading Content, clicking
        "I Agree," or otherwise using the Platform as an artist, you confirm you have
        read, understood, and agree to be bound by this Agreement in its entirety,
        including all Schedules and Terms and Conditions incorporated herein.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">02 — Platform Purpose</h3>
      <p>
        Music Exclusive is an artist-first music streaming and fan engagement platform
        where artists release exclusive music to fans before distributing to other digital
        streaming platforms. The Platform operates on a Pay-Per-Stream and Superfan
        Membership model where fans purchase credits to stream Content.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">03 — Definitions</h3>
      <ul className="list-disc list-outside ml-5 space-y-2">
        <li><strong>"Content"</strong> means all sound recordings, compositions, cover art, images, metadata, audio-visual works, and other materials you upload to the Platform.</li>
        <li><strong>"Verified Stream"</strong> means a legitimate, fan-initiated stream that meets Platform validation requirements and is not the result of fraud or Streaming Manipulation.</li>
        <li><strong>"Exclusivity Window"</strong> means the three (3) week period following each Content release during which Artist's Content is exclusive to the Platform.</li>
        <li><strong>"Authorized Platforms"</strong> means Music Exclusive and any other digital platforms on which Company is authorized to distribute Content.</li>
        <li><strong>"Streaming Manipulation"</strong> means any artificial inflation of stream counts by human or non-human means not representing bona fide end-user listening.</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">04 — Term & Termination</h3>
      <p>
        The Term of this Agreement is one (1) year from the date Artist accepts this
        Agreement, and automatically renews for additional one (1) year periods unless
        Artist provides written notice of non-renewal. Artist may request removal of
        Content from the Platform at any time by written request to
        support@musicexclusive.co. Company reserves the right to remove Content or
        terminate this Agreement at its sole discretion at any time, including but not
        limited to cases of copyright infringement, fraud, Streaming Manipulation, or
        breach of this Agreement.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">05 — Exclusivity Window</h3>
      <p>
        For a period of <strong>three (3) weeks</strong> following the initial release of
        each individual Content on the Platform, Artist grants Company the exclusive right
        to distribute and collect revenue from that Content. During the Exclusivity Window,
        Artist shall not publish, distribute, or otherwise make the Content available on
        any other website, platform, or medium.
      </p>
      <p className="mt-2">
        After the Exclusivity Window, Artist may distribute the Content elsewhere. Company
        retains the right to continue streaming the Content on the Platform indefinitely
        unless otherwise agreed in writing.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">06 — Rights Granted</h3>
      <p>
        During the Exclusivity Window, Artist grants Company the sole and exclusive right
        to host, store, stream, distribute, transmit, publicly perform, display, reproduce,
        enforce, monetize, and otherwise exploit the Content on the Platform and all
        Authorized Platforms. Following the Exclusivity Window, these rights become
        non-exclusive for the remainder of the Term.
      </p>
      <p className="mt-2 font-medium text-foreground">
        Artist retains full ownership of all intellectual property rights in the Content.
        Nothing in this Agreement transfers copyright or ownership of Content from Artist
        to Company.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">07 — Compensation & Streaming Rates</h3>
      <p>
        Artist shall receive royalties for verified streams of their Content according to
        the following rates:
      </p>
      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="font-semibold text-foreground mb-1">Streaming Rates:</p>
        <ul className="list-disc list-outside ml-5 space-y-1">
          <li><strong>Pay-Per-Stream:</strong> $0.20 per stream — $0.10 to Artist, $0.10 to Company</li>
          <li><strong>Superfan Membership:</strong> $0.20 per stream — $0.10 to Artist, $0.10 to Company</li>
        </ul>
      </div>
      <p className="mt-2">
        Artist earnings consist of all revenue actually collected by Company from verified
        streams, inclusive of any applicable Cash Bonus Program payments and Exclusive
        Charts Bonus Program prizes, less any refunds, chargebacks, and reasonable
        administrative costs.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">08 — Payout Schedule & Payment Method</h3>
      <p>
        Artist earnings are paid every Monday for all verified streams and bonuses earned
        during the prior calendar week. Payouts are subject to a minimum threshold of One
        U.S. Dollar ($1.00); earnings below this threshold are carried forward to the next
        Monday's payout cycle.
      </p>
      <p className="mt-2">
        All payments are made exclusively via Stripe through Artist's connected Stripe
        Express payout account in the Artist Dashboard. Artist is solely responsible for
        creating, maintaining, and keeping their Stripe account current. Company is not
        responsible for payment delays or failures caused by incorrect or outdated Stripe
        account information. Company may delay payouts if fraud, Streaming Manipulation,
        chargebacks, or disputes are suspected.
      </p>
      <p className="mt-2">
        The registering Artist or their authorized management is solely responsible for all
        royalty splits among collaborators, producers, co-writers, and featured artists.
        Company pays royalties in full to the registered payout account and bears no
        responsibility for further distribution of funds to third parties.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">09 — Tax Information & Withholding</h3>
      <p>
        Submission of valid tax information is required before any payments may be released.
        U.S.-based artists must submit IRS Form W-9. International artists must submit IRS
        Form W-8BEN or the applicable equivalent. All tax documentation is collected via the
        Platform's Stripe Connect onboarding flow in the Artist Dashboard.
      </p>
      <p className="mt-2">
        Company will withhold all payments until valid tax information has been submitted and
        verified. Company will issue a Form 1099 (or applicable international equivalent) at
        the conclusion of each calendar year in accordance with applicable law. Artist is
        solely responsible for their own tax obligations and is encouraged to consult a
        qualified tax professional.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">10 — Cash Bonus Program</h3>
      <p>
        Company offers a one-time, performance-based Cash Bonus Program for achieving
        verified streaming milestones. Each milestone may only be earned once per Artist.
        Milestones must be achieved sequentially:
      </p>
      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
        <li>1,000 Verified Streams — $25.00</li>
        <li>2,500 Verified Streams — $50.00</li>
        <li>5,000 Verified Streams — $100.00</li>
        <li>10,000 Verified Streams — $125.00</li>
      </ul>
      <p className="mt-2">
        Maximum total payout: <strong>$300.00</strong> per Artist. Cash bonuses are paid on
        the standard weekly Monday payout schedule following Company's verification of the
        qualifying milestone. Artist is ineligible for bonuses if Company determines streams
        resulted from Streaming Manipulation or fraudulent activity. Company reserves the
        right to withhold, reverse, or recoup any bonus amounts previously paid in the event
        of disqualification.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">11 — Exclusive Charts Bonus Program</h3>
      <p>
        Upon completing the Cash Bonus Program (receipt of the full $300.00), Artist becomes
        permanently eligible for the Exclusive Charts Bonus Program. The program awards cash
        prizes to the top three (3) ranked artists per genre on an annual calendar-year basis
        (January 1 through December 31).
      </p>
      <p className="mt-2">
        The ten (10) eligible genres are: Pop, Hip-Hop/Rap, Latin Music, Country, Electronic
        Dance Music (EDM), Rock, Phonk & Trap, K-Pop, Alternative/Indie, and R&B.
      </p>
      <p className="mt-2">
        To be eligible in a genre, Artist must have accumulated a minimum of 10,000
        cumulative Verified Streams in that genre (Qualification Threshold). This is a
        one-time lifetime gate — once qualified in a genre, Artist remains eligible for all
        future annual cycles in that genre. Annual rankings reset each January 1; cumulative
        stream counts are never reset.
      </p>
      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="font-semibold text-foreground mb-1">Annual Prizes Per Genre:</p>
        <ul className="list-disc list-outside ml-5 space-y-1">
          <li><strong>1st Place</strong> — $500.00</li>
          <li><strong>2nd Place</strong> — $250.00</li>
          <li><strong>3rd Place</strong> — $100.00</li>
        </ul>
      </div>
      <p className="mt-2">
        Artists qualifying in multiple genres may win prizes in each. Prizes are paid within
        thirty (30) days of cycle close, subject to fraud review. All qualified artists are
        displayed on the Exclusive Charts leaderboard alongside their country flag. Artist is
        ineligible for prizes if streams resulted from Streaming Manipulation or fraud.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">12 — Artist Representations & Warranties</h3>
      <p>Artist represents and warrants that:</p>
      <ul className="list-[lower-alpha] list-outside ml-5 space-y-1.5 mt-2">
        <li>Artist has the full right and authority to enter into this Agreement and grant all rights contained herein.</li>
        <li>Artist has not granted and will not grant any rights that conflict with or impair Company's rights under this Agreement.</li>
        <li>The Content will be produced, and Artist will at all times act, in material compliance with the terms and conditions of all Authorized Platforms.</li>
        <li>Artist owns or controls all rights in the Content and no third-party consents are required for Company to exercise its rights hereunder.</li>
        <li>Royalty splits among collaborators, producers, and co-writers will be reported accurately and displayed transparently on the Platform.</li>
        <li>Artist will not engage in fraudulent streaming, Streaming Manipulation, or any conduct that harms the integrity of the Platform.</li>
        <li>The Content does not and will not violate any copyright or other right of any third party.</li>
        <li>Artist is either 18 years of age or older, an emancipated minor, or possesses legal parental or guardian consent, and is fully able and competent to enter into and comply with this Agreement.</li>
        <li>Artist has established, or agrees to establish prior to receiving payment, a valid Stripe Express payout account through the Artist Dashboard, and shall maintain such account in good standing throughout the Term.</li>
        <li>Artist shall ensure their artist profile and all Content metadata (including track titles, genre classifications, release dates, and featured artist credits) is accurate, complete, and kept current throughout the Term. Inaccurate metadata may affect royalty allocation and Exclusive Charts eligibility.</li>
        <li>Where any Content is wholly or partially generated using artificial intelligence tools (AI-Generated Content), Artist shall disclose such use at time of upload via the Platform's metadata fields. Artist warrants that AI-Generated Content does not infringe any third-party rights and that Artist has all necessary rights to upload and monetize it. Company may remove, restrict, or decline to monetize AI-Generated Content that violates applicable law or Company policy.</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">13 — Streaming Manipulation & Termination</h3>
      <p>
        Artist agrees not to engage in, permit, encourage, or employ third parties to engage
        in Streaming Manipulation. Streaming Manipulation includes but is not limited to: use
        of bots, scripts, click-farms, inauthentic accounts, shared account information, or
        virtual private networks to artificially inflate stream counts, followers, or
        engagement metrics.
      </p>
      <p className="mt-2">If Company determines manipulation has occurred, Company may:</p>
      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
        <li>Suspend or permanently terminate Artist access</li>
        <li>Withhold, reverse, or recoup all earnings tied to manipulation</li>
        <li>Charge a minimum $20.00 processing fee per affected release</li>
        <li>Retain 100% of royalties collected during the Term if termination results from Artist breach</li>
      </ul>
      <p className="mt-2">
        Company may also terminate this Agreement at any time for any reason upon written
        notice to Artist, including disruption to Company's business, Improper Content,
        alleged misconduct, or violation of third-party intellectual property rights.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">14 — Digital Watermarking & Content Protection</h3>
      <p>
        All audio Content uploaded to the Platform is embedded with a unique imperceptible
        Digital Watermark linked to Artist's account at time of upload. Company employs
        additional technical safeguards including gated playback, tokenized stream delivery,
        and access controls.
      </p>
      <p className="mt-2">
        Company does not and cannot guarantee absolute protection against all forms of
        unauthorized copying or distribution. Company expressly disclaims liability for
        losses arising from unauthorized copying by third parties. Artist is encouraged to
        independently register works with the U.S. Copyright Office or applicable authority
        in their jurisdiction.
      </p>
      <p className="mt-2">
        Artist may report suspected infringement by emailing support@musicexclusive.co with
        subject line "Infringement Report." Company will conduct a reasonable investigation.
        Company may, upon written request, provide Digital Watermark data to assist Artist in
        pursuing an infringement claim. Users confirmed to have copied or redistributed
        Content without authorization may be immediately and permanently removed from the
        Platform without refund.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">15 — Limitation of Liability & Indemnification</h3>
      <p>
        To the maximum extent permitted by law, Company is not liable for any indirect,
        incidental, special, consequential, or punitive damages arising from use of the
        Platform or this Agreement.
      </p>
      <p className="mt-2">
        Artist will indemnify, hold harmless, and defend Company and its affiliates, officers,
        directors, employees, and agents from and against any and all claims, damages, costs,
        and expenses (including reasonable attorneys' fees) arising out of Artist's breach or
        alleged breach of any warranty, representation, or covenant in this Agreement.
      </p>
    </section>

    <section>
      <h3 className="text-base font-semibold text-foreground mb-2">16 — Dispute Resolution & Governing Law</h3>
      <p>
        This Agreement is governed by the laws of the State of Arizona. Any disputes arising
        out of or relating to this Agreement shall be resolved by binding arbitration in
        accordance with the arbitration provisions in Company's Terms of Use, which are
        incorporated herein by reference. Each Party knowingly and irrevocably waives any
        right to a trial by jury. Artist may opt out of arbitration by sending written notice
        to Company within thirty (30) days of first registering for the Services.
      </p>
    </section>

    <div className="pt-4 border-t border-border/30">
      <p className="text-xs text-muted-foreground text-center italic">
        By signing below, you confirm you have read, understood, and agree to all terms of
        this Artist Participation Agreement. Questions? Contact support@musicexclusive.co
      </p>
    </div>
  </div>
);

export default AgreementTextContent;
