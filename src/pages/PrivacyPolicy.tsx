import { Header } from "@/components/Header"
import { GlowCard } from "@/components/ui/GlowCard"
import { ScrollArea } from "@/components/ui/scroll-area"

const PRIVACY_POLICY = `MUSIC EXCLUSIVE
PRIVACY POLICY

Effective Date: January 31, 2026

Music Exclusive ("Company," "we," "us," or "our") respects your privacy. This Privacy Policy explains how we collect, use, store, and share information when you use the Music Exclusive platform, including our website and services (the "Services").

By using the Services, you agree to this Privacy Policy.

1. INFORMATION WE COLLECT
We may collect the following types of information:

A) Information You Provide
- Name, username, or artist name
- Email address
- Profile details (bio, genre, social links)
- Uploaded content (artist songs, cover art, images, metadata)
- Messages or shared content sent through the platform inbox

B) Payment Information
Payments may be processed through third-party providers such as Stripe.
We do not store full payment card details. Payment providers may collect and store billing details according to their own policies.

C) Usage and Device Information
We may collect information about how you use the Services, including:
- Pages visited and features used
- Streaming activity and engagement
- Device type, browser type, IP address (or general location), and basic analytics

2. HOW WE USE YOUR INFORMATION
We use information to:
- Provide and operate the Services
- Verify access through the Vault Lottery System
- Process subscriptions and credit purchases
- Track streams and calculate artist earnings
- Improve platform performance, safety, and user experience
- Prevent fraud, abuse, and streaming manipulation
- Communicate important account updates and service messages

3. SHARING OF INFORMATION
We may share information:
- With service providers that help us operate the platform (hosting, analytics, email delivery, payments)
- If required by law, legal process, or government request
- To enforce our Terms of Use and protect platform safety

We do not sell your personal information.

4. ARTIST CONTENT AND PUBLIC INFORMATION
Artist profiles may display public information such as:
- Artist name
- Bio
- Profile image
- Uploaded music and cover art

Fans may view artist pages only after they are granted access to the platform.

5. DATA RETENTION
We retain information as long as necessary to:
- Provide the Services
- Maintain platform security and fraud prevention
- Meet legal or accounting requirements

6. SECURITY
We take reasonable steps to protect user information. However, no online service can guarantee 100% security.

7. CHILDREN'S PRIVACY
The Services are not intended for children under 13. If we learn that we collected information from a child under 13, we may delete it.

8. YOUR CHOICES
You may:
- Update your profile information within the app
- Request deletion of your account by contacting support

9. CONTACT US
If you have questions about this Privacy Policy, contact us at:
support@musicexclusive.co`

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-lg md:max-w-2xl mx-auto px-4 pt-20 pb-8">
        <GlowCard className="p-6">
          <h1 className="text-2xl font-display font-bold tracking-wide mb-6 text-center">
            <span className="text-foreground">PRIVACY </span>
            <span className="text-primary">POLICY</span>
          </h1>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm font-body text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {PRIVACY_POLICY}
            </div>
          </ScrollArea>
        </GlowCard>
      </main>
    </div>
  )
}

export default PrivacyPolicy
