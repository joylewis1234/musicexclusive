import { LegalPageLayout, LegalSection } from "@/components/legal";

const EFFECTIVE_DATE = "January 31, 2026";

const RefundPolicy = () => {
  return (
    <LegalPageLayout
      title="Refund Policy"
      effectiveDate={EFFECTIVE_DATE}
      summary="All sales on Music Exclusive are final. Credits, subscriptions, and completed streams are non-refundable except where required by law."
    >
      <LegalSection number="01" title="General Policy">
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
          <p className="font-semibold text-foreground text-base">
            All sales are final.
          </p>
        </div>
        
        <p>
          Music Exclusive does not provide refunds or credits for:
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-3">
          <li>Subscription payments (including Superfan Membership)</li>
          <li>Credit purchases (Pay-As-You-Go)</li>
          <li>Any streams completed through the platform</li>
        </ul>
        <p className="mt-4">
          Once a stream is played, credits are considered used and are non-refundable.
        </p>
      </LegalSection>

      <LegalSection number="02" title="Exceptions">
        <p>
          Refunds may only be issued if required by applicable law.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Billing Errors" showDivider={false}>
        <p>
          If you believe you were charged in error, contact us at:
        </p>
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
          By using Music Exclusive, you agree to this Refund Policy.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default RefundPolicy;
