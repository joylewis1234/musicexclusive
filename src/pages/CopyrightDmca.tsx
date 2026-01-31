import { LegalPageLayout, LegalSection } from "@/components/legal";

const EFFECTIVE_DATE = "January 31, 2026";

const CopyrightDmca = () => {
  return (
    <LegalPageLayout
      title="Copyright & DMCA Policy"
      effectiveDate={EFFECTIVE_DATE}
      summary="Music Exclusive respects intellectual property rights. This policy outlines our procedures for reporting and addressing copyright infringement under the Digital Millennium Copyright Act."
    >
      <LegalSection number="01" title="Overview">
        <p>
          Music Exclusive respects the intellectual property rights of others and expects 
          all users to do the same.
        </p>
        <p>
          If you believe that content available on Music Exclusive infringes your copyright, 
          you may submit a Digital Millennium Copyright Act ("DMCA") takedown request.
        </p>
      </LegalSection>

      <LegalSection number="02" title="How to Submit a DMCA Takedown Request">
        <p>
          To file a DMCA notice, email us with the subject line: <strong>"DMCA Takedown Request"</strong>
        </p>
        
        <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="font-semibold text-foreground mb-2">Company's Copyright Agent:</p>
          <p className="font-medium text-foreground">Delgado Entertainment Law PLLC</p>
          <p>Attn: Guyliana Plantain</p>
          <p>3295 North Drinkwater Blvd., Suite 9</p>
          <p>Scottsdale, Arizona 85251</p>
          <p className="mt-2">
            <a href="mailto:Gigi@delgadoentertainmentlaw.com" className="text-primary hover:underline">
              Gigi@delgadoentertainmentlaw.com
            </a>
          </p>
        </div>

        <p className="mt-4">Your notice must include:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Your physical or electronic signature</li>
          <li>Identification of the copyrighted work claimed to be infringed</li>
          <li>Identification of the infringing content and where it is located on the platform</li>
          <li>Your name, address, phone number, and email address</li>
          <li>A statement that you have a good faith belief the use is not authorized</li>
          <li>A statement under penalty of perjury that the information is accurate and you are authorized to act</li>
        </ul>
      </LegalSection>

      <LegalSection number="03" title="Counter-Notice">
        <p>
          If you believe your content was removed by mistake, you may submit a counter-notice 
          to the Copyright Agent that includes:
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Your signature</li>
          <li>Identification of the removed content and its prior location</li>
          <li>A statement under penalty of perjury that removal was due to mistake or misidentification</li>
          <li>Your name, address, phone number, and email address</li>
          <li>A statement consenting to jurisdiction of the federal court in Arizona and accepting service of process</li>
        </ul>
      </LegalSection>

      <LegalSection number="04" title="Repeat Infringement">
        <p>
          Music Exclusive may terminate accounts of repeat infringers or users who violate 
          intellectual property rights.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Contact" showDivider={false}>
        <p>For questions, contact:</p>
        <div className="mt-3">
          <a 
            href="mailto:support@musicexclusive.co" 
            className="text-primary hover:underline font-medium"
          >
            support@musicexclusive.co
          </a>
        </div>
      </LegalSection>

      <div className="mt-10 pt-6 border-t border-border/30">
        <p className="text-sm text-muted-foreground text-center">
          By using Music Exclusive, you agree to this Copyright & DMCA Policy.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default CopyrightDmca;
