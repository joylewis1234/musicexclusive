import { Header } from "@/components/Header"
import { GlowCard } from "@/components/ui/GlowCard"
import { ScrollArea } from "@/components/ui/scroll-area"

const COPYRIGHT_DMCA_POLICY = `MUSIC EXCLUSIVE
COPYRIGHT & DMCA POLICY

Effective Date: January 31, 2026

Music Exclusive ("Company," "we," "us," or "our") respects the intellectual property rights of others and expects users of our platform to do the same. This Copyright & DMCA Policy outlines how we handle claims of copyright infringement in accordance with the Digital Millennium Copyright Act ("DMCA").

1. REPORTING COPYRIGHT INFRINGEMENT

If you believe that content on Music Exclusive infringes your copyright, you may submit a DMCA takedown notice to our designated Copyright Agent.

Your notice must include:
- A physical or electronic signature of the copyright owner or authorized representative
- Identification of the copyrighted work claimed to have been infringed
- Identification of the material that is claimed to be infringing, including sufficient information for us to locate it on the platform
- Your contact information (name, address, telephone number, email address)
- A statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law
- A statement, made under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the copyright owner

2. DESIGNATED COPYRIGHT AGENT

DMCA notices should be sent to:

Email: dmca@musicexclusive.co
Subject Line: DMCA Takedown Notice

3. COUNTER-NOTIFICATION

If you believe your content was removed by mistake or misidentification, you may submit a counter-notification to our Copyright Agent.

Your counter-notification must include:
- Your physical or electronic signature
- Identification of the material that was removed and its location before removal
- A statement under penalty of perjury that you have a good faith belief the material was removed due to mistake or misidentification
- Your name, address, and telephone number
- A statement that you consent to the jurisdiction of the federal court in your district and that you will accept service of process from the party who submitted the original DMCA notice

Upon receipt of a valid counter-notification, we may restore the removed content within 10-14 business days unless the original complainant files a court action.

4. REPEAT INFRINGER POLICY

Music Exclusive maintains a policy of terminating, in appropriate circumstances, the accounts of users who are repeat infringers of copyright.

We reserve the right to:
- Remove or disable access to infringing content
- Terminate accounts of users who repeatedly infringe copyrights
- Take other appropriate action at our sole discretion

5. ARTIST REPRESENTATIONS

By uploading content to Music Exclusive, artists represent and warrant that:
- They own or control all necessary rights to the content
- The content does not infringe any third-party copyrights, trademarks, or other intellectual property rights
- They have obtained all necessary licenses, permissions, and clearances

6. FALSE CLAIMS

Please note that under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material is infringing may be subject to liability for damages.

7. CONTACT US

For questions about this Copyright & DMCA Policy, contact us at:
dmca@musicexclusive.co`

const CopyrightDmca = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-lg md:max-w-2xl mx-auto px-4 pt-20 pb-8">
        <GlowCard className="p-6">
          <h1 className="text-2xl font-display font-bold tracking-wide mb-6 text-center">
            <span className="text-foreground">COPYRIGHT & </span>
            <span className="text-primary">DMCA</span>
          </h1>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm font-body text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {COPYRIGHT_DMCA_POLICY}
            </div>
          </ScrollArea>
        </GlowCard>
      </main>
    </div>
  )
}

export default CopyrightDmca