import { LegalPageLayout, LegalSection } from "@/components/legal";

const EFFECTIVE_DATE = "January 31, 2026";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
      summary="This Privacy Policy explains how Music Exclusive collects, uses, stores, and shares your information. We respect your privacy and are committed to protecting your personal data."
    >
      <LegalSection number="01" title="Introduction">
        <p>
          Music Exclusive ("Company," "we," "us," or "our") respects your privacy. This 
          Privacy Policy explains how we collect, use, store, and share information when 
          you use the Music Exclusive platform, including our website and services (the "Services").
        </p>
        <p className="font-medium text-foreground">
          By using the Services, you agree to this Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection number="02" title="Information We Collect">
        <p>We may collect the following types of information:</p>
        
        <p className="mt-4"><strong>A) Information You Provide</strong></p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Name, username, or artist name</li>
          <li>Email address</li>
          <li>Profile details (bio, genre, social links)</li>
          <li>Uploaded content (artist songs, cover art, images, metadata)</li>
          <li>Messages or shared content sent through the platform inbox</li>
        </ul>

        <p className="mt-4"><strong>B) Payment Information</strong></p>
        <p>
          Payments may be processed through third-party providers such as Stripe. We do not 
          store full payment card details. Payment providers may collect and store billing 
          details according to their own policies.
        </p>

        <p className="mt-4"><strong>C) Usage and Device Information</strong></p>
        <p>We may collect information about how you use the Services, including:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Pages visited and features used</li>
          <li>Streaming activity and engagement</li>
          <li>Device type, browser type, IP address (or general location), and basic analytics</li>
        </ul>
      </LegalSection>

      <LegalSection number="03" title="How We Use Your Information">
        <p>We use information to:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Provide and operate the Services</li>
          <li>Verify access through the Vault Access System</li>
          <li>Process subscriptions and credit purchases</li>
          <li>Track streams and calculate artist earnings</li>
          <li>Improve platform performance, safety, and user experience</li>
          <li>Prevent fraud, abuse, and streaming manipulation</li>
          <li>Communicate important account updates and service messages</li>
        </ul>
      </LegalSection>

      <LegalSection number="04" title="Sharing of Information">
        <p>We may share information:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>With service providers that help us operate the platform (hosting, analytics, email delivery, payments)</li>
          <li>If required by law, legal process, or government request</li>
          <li>To enforce our Terms of Use and protect platform safety</li>
        </ul>
        <p className="mt-3 font-medium text-foreground">
          We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Artist Content and Public Information">
        <p>Artist profiles may display public information such as:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Artist name</li>
          <li>Bio</li>
          <li>Profile image</li>
          <li>Uploaded music and cover art</li>
        </ul>
        <p className="mt-3">
          Fans may view artist pages only after they are granted access to the platform.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Data Retention">
        <p>We retain information as long as necessary to:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Provide the Services</li>
          <li>Maintain platform security and fraud prevention</li>
          <li>Meet legal or accounting requirements</li>
        </ul>
      </LegalSection>

      <LegalSection number="07" title="Security">
        <p>
          We take reasonable steps to protect user information. However, no online service 
          can guarantee 100% security.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Children's Privacy">
        <p>
          The Services are not intended for children under 13. If we learn that we collected 
          information from a child under 13, we may delete it.
        </p>
      </LegalSection>

      <LegalSection number="09" title="Your Choices">
        <p>You may:</p>
        <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
          <li>Update your profile information within the app</li>
          <li>Request deletion of your account by contacting support</li>
        </ul>
      </LegalSection>

      <LegalSection number="10" title="Contact Us" showDivider={false}>
        <p>If you have questions about this Privacy Policy, contact us at:</p>
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
          By using Music Exclusive, you agree to this Privacy Policy.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
