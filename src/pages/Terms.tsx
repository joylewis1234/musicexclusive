import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Home } from "lucide-react";

const TERMS_VERSION = "1.0";
const EFFECTIVE_DATE = "January 31, 2025";

const TERMS_OF_USE = `MUSIC EXCLUSIVE
TERMS OF USE

Effective Date: ${EFFECTIVE_DATE}

These Terms of Use (the "Terms") apply to all users, including artists and fans, who access or use the Music Exclusive website, web services, streaming services, and any other services (collectively, the "Services") offered by Music Exclusive ("Company," "we," or "us").

Artist-specific terms may also be governed separately by the Artist Participation Agreement; however, all users must comply with these Terms.

These Terms constitute a binding agreement between you and Company. If you do not agree to these Terms, do not access or use the Services.

1. ABOUT MUSIC EXCLUSIVE

Music Exclusive is an artist-first music streaming and fan engagement platform built on fairness, exclusivity, and transparency. Our goal is to ensure that every stream counts and every fan matters.

Music Exclusive uses the Vault Lottery System to provide unique access for fans and promote authentic discovery. We may use technology tools designed to help prevent fraud, detect fake engagement, and support artists through real fan activity rather than paid advertising.

2. OUR SERVICES

2.1 Content

"Content" means any copyrightable material you provide, upload, or otherwise make available to us through the Services, including but not limited to sound recordings, musical compositions, photos/images, videos, artwork, and cover art.

We offer the Services for Content you upload, subject to these Terms and at our sole discretion.

3. GRANT OF RIGHTS TO CONTENT

By uploading Content, you grant Company a non-exclusive right to host, store, distribute, stream, and display your Content through the Services for the purpose of operating Music Exclusive. This includes the right to display cover art, artist name, and related metadata, and to promote Content within the platform.

3.1 Name and Likeness

You grant Company the right to use your approved name, image, biography, and likeness as necessary to display and promote your Content within Music Exclusive.

3.2 Rights You Retain

You retain all rights, title, and interest in your Content, including all intellectual property rights. Nothing in these Terms transfers ownership of your Content to Company.

4. TERMINATION OF ACCESS

We reserve the right to suspend or terminate your access to the Services at any time if we believe you violated these Terms or engaged in misconduct, including but not limited to streaming manipulation, fraudulent activity, uploading infringing or unlawful Content, or abuse of the platform.

You may stop using the Services at any time.

5. PAYMENTS, CREDITS, AND STREAMING COSTS

Music Exclusive currently offers two fan payment options:

5.1 Pay-As-You-Go (Credits)

Fans may purchase credits and use credits to stream Content.
• 1 credit = $0.20
• Each stream costs 1 credit ($0.20) unless otherwise stated
• Fans must maintain a minimum Pay-As-You-Go balance of $5.00 to remain active on the platform. If a fan's balance drops below $5.00, access may be paused until the balance is replenished.

5.2 Superfan Membership

Fans may subscribe to the Superfan Membership:
• $5.00 per month
• Includes 10 free streams added to the fan's streaming balance each month
• Streams reset monthly and do not roll over unless explicitly stated
• Streams are consumed when the fan streams Content

Company may update pricing or benefits in the future with notice.

6. NO REFUNDS POLICY

All payments are final. No refunds are issued once credits are purchased, a subscription is billed, or a stream has been completed, except where required by applicable law.

7. VAULT LOTTERY SYSTEM

Music Exclusive uses the Vault Lottery System ("Lottery") to grant fan access to the platform. Instead of open sign-ups, fans may enter the Lottery for a chance to gain access. Some fans may receive bypass access through approved methods such as Superfan Membership access or platform-issued promotions.

Lottery mechanics may change over time and are not fully disclosed. Company may remove access for abuse, fraud, or violations of these Terms.

8. USER RESPONSIBILITIES

You agree that you will provide accurate information, keep your login credentials secure, not share your account access, and use the Services lawfully and respectfully.

8.1 Content Upload Responsibilities (Artists)

Artists agree they own or control the rights to the Content they upload and that Content does not infringe third-party rights.

You are solely responsible for maintaining backups of your Content.

9. PROHIBITED ACTIVITY

You may not use the Services to commit fraud or streaming manipulation, harass or impersonate others, upload illegal or infringing Content, attempt to reverse engineer the platform, or use bots/scripts/automation to abuse platform features.

10. STREAMING MANIPULATION & IMPROPER CONTENT

10.1 Streaming Manipulation

"Streaming Manipulation" includes any activity that artificially inflates streams or engagement and does not reflect real fan listening. If we detect or suspect streaming manipulation, we may remove Content, suspend or terminate accounts, and withhold or reverse earnings tied to manipulation.

10.2 Improper Content

"Improper Content" includes Content that violates laws, infringes intellectual property, or harms the platform, users, or Company's reputation. We reserve the right to remove Improper Content at any time.

11. AI AND PLATFORM IMPROVEMENT

Music Exclusive may use analytics and engagement data to improve the user experience, platform performance, and discovery tools. We do not use user-uploaded music Content to train public generative AI models.

12. COPYRIGHT COMPLAINTS (DMCA)

If you believe Content on Music Exclusive infringes your copyright, submit a DMCA request to:

Delgado Entertainment Law PLLC
Attn: Guyliana Plantain
3295 North Drinkwater Blvd., Suite 9
Scottsdale, Arizona 85251
Gigi@delgadoentertainmentlaw.com
Subject Line: DMCA Takedown Request

13. LIMITATION OF LIABILITY

To the maximum extent allowed by law, Company is not liable for indirect, incidental, special, consequential, or punitive damages arising out of your use of the Services.

14. DISPUTE RESOLUTION & ARBITRATION

Any dispute arising out of or relating to these Terms will be resolved through binding arbitration unless prohibited by law. You waive the right to a jury trial.

15. MISCELLANEOUS

Taxes: You are responsible for any taxes you owe.
Severability: If any part of these Terms is invalid, the rest remains enforceable.
Amendments: We may update these Terms at any time.
Assignment: Company may assign these Terms; users may not assign without written consent.`;

const Terms = () => {
  const navigate = useNavigate();

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
            {/* Framed Header */}
            <div className="flex justify-center mb-8">
              <SectionHeader 
                title="Terms of Use" 
                align="center" 
                framed 
              />
            </div>

            <p className="text-muted-foreground text-center mb-2 text-sm">
              Version {TERMS_VERSION} • Effective {EFFECTIVE_DATE}
            </p>

            <p className="text-muted-foreground text-center mb-8 text-xs">
              Please read these terms carefully before using Music Exclusive.
            </p>

            {/* Terms Content */}
            <div className="border border-border/50 rounded-lg bg-background/50">
              <ScrollArea className="h-[60vh] p-4 md:p-6">
                <pre className="whitespace-pre-wrap text-xs md:text-sm text-muted-foreground font-body leading-relaxed">
                  {TERMS_OF_USE}
                </pre>
              </ScrollArea>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-6">
              By using Music Exclusive, you agree to these Terms of Use.
            </p>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default Terms;
