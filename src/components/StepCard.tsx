import { LucideIcon } from "lucide-react"
import { GlowCard } from "@/components/ui/GlowCard"

interface StepCardProps {
  stepNumber: number
  title: string
  description: string
  icon: LucideIcon
}

const StepCard = ({ stepNumber, title, description, icon: Icon }: StepCardProps) => {
  return (
    <GlowCard glowColor="gradient" className="w-full group">
      <div className="p-5 transition-all duration-300 group-hover:bg-card-hover/30">
        {/* Step Header */}
        <div className="flex items-start gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
            <Icon className="w-6 h-6 text-primary group-hover:text-primary-glow transition-colors" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base text-foreground font-bold tracking-wider mb-2">
              STEP {stepNumber} — {title}
            </h3>
            {/* Description */}
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </GlowCard>
  )
}

export { StepCard }
