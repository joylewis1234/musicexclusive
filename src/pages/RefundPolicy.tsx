import { Header } from "@/components/Header"
import { GlowCard } from "@/components/ui/GlowCard"
import { ScrollArea } from "@/components/ui/scroll-area"

const REFUND_POLICY = `MUSIC EXCLUSIVE
REFUND POLICY

Effective Date: January 31, 2026

Music Exclusive ("Company," "we," "us," or "our") is committed to providing a quality experience for all users. Please read this Refund Policy carefully before making any purchases on our platform.

1. GENERAL POLICY
All purchases made on Music Exclusive are final and non-refundable.

This includes:
- Credit purchases (Pay-As-You-Go)
- Superfan Membership subscriptions
- Any other digital goods or services

2. CREDITS (PAY-AS-YOU-GO)
Credits are purchased at a rate of $0.20 per credit (1 credit = 1 stream).

Once credits are purchased:
- They are immediately added to your account
- They do not expire
- They cannot be refunded, exchanged, or transferred
- Unused credits remain in your account until used

A minimum balance of $5.00 (25 credits) is required to maintain active access to the platform.

3. SUPERFAN MEMBERSHIP
The Superfan Membership is a recurring monthly subscription at $5.00/month.

Membership includes 25 credits per month that reset at each billing cycle.

Regarding Superfan Membership refunds:
- Subscription fees are non-refundable
- Unused monthly credits do not roll over and cannot be refunded
- You may cancel your subscription at any time to prevent future charges
- Cancellation takes effect at the end of your current billing period

4. EXCEPTIONS
We may, at our sole discretion, consider refund requests in cases of:
- Duplicate charges due to technical error
- Unauthorized transactions (with proper verification)
- Platform-wide service outages affecting purchased services

To request a refund exception, contact us within 7 days of the transaction.

5. HOW TO REQUEST A REFUND EXCEPTION
Email us at:
support@musicexclusive.co

Include the following information:
- Your account email address
- Date of transaction
- Transaction amount
- Reason for refund request
- Any supporting documentation

6. PROCESSING TIME
If a refund exception is approved:
- Refunds will be processed within 5-10 business days
- Refunds will be credited to the original payment method
- You will receive email confirmation once processed

7. CHARGEBACKS
If you initiate a chargeback with your bank or credit card company without first contacting us, we reserve the right to:
- Suspend or terminate your account
- Pursue recovery of the disputed amount
- Take appropriate legal action

We encourage you to contact us first to resolve any billing issues.

8. CONTACT US
For questions about this Refund Policy or to request assistance:
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