import { Header } from "@/components/Header"
import { GlowCard } from "@/components/ui/GlowCard"
import { ScrollArea } from "@/components/ui/scroll-area"

const PRIVACY_POLICY = `MUSIC EXCLUSIVE
PRIVACY POLICY

Effective Date: January 31, 2026

This Privacy Policy describes how Music Exclusive ("Company," "we," "us," or "our") collects, uses, and shares information about you when you use our website, mobile applications, and other online products and services (collectively, the "Services") or when you otherwise interact with us.

1. INFORMATION WE COLLECT

Information You Provide to Us:
- Account information (name, email address, password)
- Profile information (display name, profile photo)
- Payment information (processed securely through third-party payment processors)
- Content you upload (music, cover art, metadata)
- Communications with us (support requests, feedback)

Information We Collect Automatically:
- Device information (browser type, operating system, device identifiers)
- Usage information (pages viewed, features used, streaming activity)
- Log information (IP address, access times, referring URLs)
- Cookies and similar technologies

2. HOW WE USE YOUR INFORMATION

We use the information we collect to:
- Provide, maintain, and improve our Services
- Process transactions and send related information
- Send promotional communications (with your consent)
- Monitor and analyze trends, usage, and activities
- Detect, investigate, and prevent fraudulent transactions and abuse
- Personalize and improve your experience
- Comply with legal obligations

3. SHARING OF INFORMATION

We may share information about you as follows:
- With artists when you stream their music (anonymized streaming data)
- With service providers who perform services on our behalf
- In response to legal process or government requests
- To protect our rights, privacy, safety, or property
- In connection with a merger, acquisition, or sale of assets
- With your consent or at your direction

4. DATA RETENTION

We retain your information for as long as your account is active or as needed to provide you Services. We may retain certain information for legitimate business purposes or as required by law.

5. SECURITY

We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction.

6. YOUR RIGHTS AND CHOICES

You may:
- Access, update, or delete your account information
- Opt out of promotional communications
- Request a copy of your data
- Request deletion of your data (subject to legal requirements)

7. COOKIES

We use cookies and similar tracking technologies to collect information and improve our Services. You can control cookies through your browser settings.

8. CHILDREN'S PRIVACY

Our Services are not directed to children under 13. We do not knowingly collect personal information from children under 13.

9. INTERNATIONAL DATA TRANSFERS

Your information may be transferred to and processed in countries other than your country of residence.

10. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page.

11. CONTACT US

If you have any questions about this Privacy Policy, please contact us at:

Email: privacy@musicexclusive.com

END OF PRIVACY POLICY`

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
