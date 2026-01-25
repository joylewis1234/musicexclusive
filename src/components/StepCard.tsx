import { Music } from "lucide-react"
import { GlowCard } from "@/components/ui/GlowCard"

interface StepCardProps {
  stepNumber: number
  title: string
  description: string
}

const StepCard = ({ stepNumber, title, description }: StepCardProps) => {
  return (
    <GlowCard glowColor="gradient" className="w-full">
      <div className="p-5">
        {/* Step Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display text-sm text-muted-foreground tracking-wider">
            STEP {stepNumber}
          </span>
          <span className="font-display text-sm text-foreground font-bold tracking-wider">
            {title}
          </span>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm font-body uppercase tracking-wide leading-relaxed">
          {description}
        </p>
      </div>
    </GlowCard>
  )
}

export { StepCard }
