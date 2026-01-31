import { Header } from "@/components/Header"
import { GlowCard } from "@/components/ui/GlowCard"
import { ScrollArea } from "@/components/ui/scroll-area"

const REFUND_POLICY = `MUSIC EXCLUSIVE
REFUND POLICY

Effective Date: January 31, 2026

All sales are final.

Music Exclusive does not provide refunds or credits for:
- Subscription payments (including Superfan Membership)
- Credit purchases (Pay-As-You-Go)
- Any streams completed through the platform

Once a stream is played, credits are considered used and are non-refundable.

Exceptions:
Refunds may only be issued if required by applicable law.

If you believe you were charged in error, contact:
support@musicexclusive.co`

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-lg md:max-w-2xl mx-auto px-4 pt-20 pb-8">
        <GlowCard className="p-6">
          <h1 className="text-2xl font-display font-bold tracking-wide mb-6 text-center">
            <span className="text-foreground">REFUND </span>
            <span className="text-primary">POLICY</span>
          </h1>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm font-body text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {REFUND_POLICY}
            </div>
          </ScrollArea>
        </GlowCard>
      </main>
    </div>
  )
}

export default RefundPolicy