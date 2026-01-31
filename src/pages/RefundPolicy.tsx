import { LegalPageLayout, LegalSection } from "@/components/legal";

const REFUND_VERSION = "1.0";
const EFFECTIVE_DATE = "January 31, 2026";

const RefundPolicy = () => {
  return (
    <LegalPageLayout
      title="Refund Policy"
      subtitle="Our policy on payments, credits, and refunds."
      version={REFUND_VERSION}
      effectiveDate={EFFECTIVE_DATE}
    >
      <LegalSection>
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
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

      <LegalSection title="Exceptions">
        <p>
          Refunds may only be issued if required by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Billing Errors">
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

      <div className="mt-12 pt-6 border-t border-border/30">
        <p className="text-sm text-muted-foreground text-center">
          By using Music Exclusive, you agree to this Refund Policy.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default RefundPolicy;
