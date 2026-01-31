import { Header } from "@/components/Header"
import { GlowCard } from "@/components/ui/GlowCard"
import { ScrollArea } from "@/components/ui/scroll-area"

const COPYRIGHT_DMCA_POLICY = `MUSIC EXCLUSIVE
COPYRIGHT & DMCA POLICY

Effective Date: January 31, 2026

Music Exclusive respects the intellectual property rights of others and expects all users to do the same.

If you believe that content available on Music Exclusive infringes your copyright, you may submit a Digital Millennium Copyright Act ("DMCA") takedown request.

1. HOW TO SUBMIT A DMCA TAKEDOWN REQUEST
To file a DMCA notice, email us with the subject line:
"DMCA Takedown Request"

Company's Copyright Agent:
Delgado Entertainment Law PLLC
Attn: Guyliana Plantain
3295 North Drinkwater Blvd., Suite 9
Scottsdale, Arizona 85251
Gigi@delgadoentertainmentlaw.com

Your notice must include:
- Your physical or electronic signature
- Identification of the copyrighted work claimed to be infringed
- Identification of the infringing content and where it is located on the platform
- Your name, address, phone number, and email address
- A statement that you have a good faith belief the use is not authorized
- A statement under penalty of perjury that the information is accurate and you are authorized to act

2. COUNTER-NOTICE
If you believe your content was removed by mistake, you may submit a counter-notice to the Copyright Agent that includes:
- Your signature
- Identification of the removed content and its prior location
- A statement under penalty of perjury that removal was due to mistake or misidentification
- Your name, address, phone number, and email address
- A statement consenting to jurisdiction of the federal court in Arizona and accepting service of process

3. REPEAT INFRINGEMENT
Music Exclusive may terminate accounts of repeat infringers or users who violate intellectual property rights.

4. CONTACT
For questions, contact:
support@musicexclusive.co`

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