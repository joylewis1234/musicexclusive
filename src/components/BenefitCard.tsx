import { GlowCard } from "@/components/ui/GlowCard"

interface BenefitCardProps {
  number: number
  title: string
  description: string
}

const BenefitCard = ({ number, title, description }: BenefitCardProps) => {
  return (
    <GlowCard glowColor="primary" className="w-full group">
      <div className="p-5 transition-all duration-300 group-hover:bg-card-hover/30">
        <div className="flex items-start gap-4">
          {/* Number Badge */}
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/40 group-hover:bg-primary/30 group-hover:border-primary/60 transition-all duration-300">
            <span className="font-display text-lg font-bold text-primary">
              {number}
            </span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-display text-base text-foreground font-bold tracking-wider mb-1">
              {title}
            </h3>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </GlowCard>
  )
}

export { BenefitCard }
