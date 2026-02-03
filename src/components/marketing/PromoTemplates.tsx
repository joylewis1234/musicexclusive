import { cn } from "@/lib/utils";
import { Crown, Sparkles, Lock, Zap, Star, Shield } from "lucide-react";

export interface PromoTemplate {
  id: string;
  name: string;
  description: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  style: "glassmorphism" | "neon" | "minimal" | "bold" | "gradient" | "dark";
}

export const PROMO_TEMPLATES: PromoTemplate[] = [
  {
    id: "neon-purple",
    name: "Neon Nights",
    description: "Purple neon glow with glassmorphism",
    gradient: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)",
    textColor: "#ffffff",
    accentColor: "#a855f7",
    style: "neon",
  },
  {
    id: "gold-luxury",
    name: "Gold Standard",
    description: "Luxury gold accents on black",
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)",
    textColor: "#ffffff",
    accentColor: "#fbbf24",
    style: "bold",
  },
  {
    id: "cyber-blue",
    name: "Cyber Wave",
    description: "Electric blue cyberpunk style",
    gradient: "linear-gradient(135deg, #0c1929 0%, #1a365d 50%, #0c1929 100%)",
    textColor: "#ffffff",
    accentColor: "#3b82f6",
    style: "neon",
  },
  {
    id: "minimal-white",
    name: "Clean Slate",
    description: "Minimal dark with white text",
    gradient: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)",
    textColor: "#ffffff",
    accentColor: "#ffffff",
    style: "minimal",
  },
  {
    id: "sunset-gradient",
    name: "Sunset Vibes",
    description: "Warm purple to orange gradient",
    gradient: "linear-gradient(135deg, #581c87 0%, #9333ea 30%, #f97316 100%)",
    textColor: "#ffffff",
    accentColor: "#fbbf24",
    style: "gradient",
  },
  {
    id: "glass-dark",
    name: "Glass Effect",
    description: "Modern glassmorphism aesthetic",
    gradient: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)",
    textColor: "#ffffff",
    accentColor: "#a855f7",
    style: "glassmorphism",
  },
];

export interface PromoBadge {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  glowColor: string;
}

export const PROMO_BADGES: PromoBadge[] = [
  {
    id: "exclusive-drop",
    label: "EXCLUSIVE DROP",
    icon: Crown,
    bgColor: "rgba(168, 85, 247, 0.9)",
    textColor: "#fbbf24",
    glowColor: "rgba(168, 85, 247, 0.5)",
  },
  {
    id: "listen-first",
    label: "LISTEN FIRST",
    icon: Zap,
    bgColor: "rgba(59, 130, 246, 0.9)",
    textColor: "#ffffff",
    glowColor: "rgba(59, 130, 246, 0.5)",
  },
  {
    id: "vault-access",
    label: "VAULT ACCESS",
    icon: Lock,
    bgColor: "rgba(255, 255, 255, 0.15)",
    textColor: "#ffffff",
    glowColor: "rgba(255, 255, 255, 0.3)",
  },
  {
    id: "released-first",
    label: "RELEASED HERE FIRST",
    icon: Sparkles,
    bgColor: "rgba(168, 85, 247, 0.9)",
    textColor: "#ffffff",
    glowColor: "rgba(168, 85, 247, 0.5)",
  },
  {
    id: "superfan-approved",
    label: "SUPERFAN APPROVED",
    icon: Star,
    bgColor: "rgba(251, 191, 36, 0.9)",
    textColor: "#1a1a1a",
    glowColor: "rgba(251, 191, 36, 0.5)",
  },
  {
    id: "limited-access",
    label: "LIMITED ACCESS",
    icon: Shield,
    bgColor: "linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9))",
    textColor: "#ffffff",
    glowColor: "rgba(168, 85, 247, 0.5)",
  },
];

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
}

export const TemplateSelector = ({ selectedTemplate, onSelect }: TemplateSelectorProps) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {PROMO_TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={cn(
            "relative aspect-[9/16] rounded-xl overflow-hidden transition-all duration-200",
            selectedTemplate === template.id
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
              : "hover:scale-102 opacity-70 hover:opacity-100"
          )}
          style={{ background: template.gradient }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
            <div
              className="w-8 h-8 rounded-full mb-1"
              style={{ backgroundColor: template.accentColor + "40" }}
            />
            <span
              className="text-[8px] font-bold uppercase tracking-wider text-center"
              style={{ color: template.textColor }}
            >
              {template.name}
            </span>
          </div>
          {selectedTemplate === template.id && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

interface BadgeSelectorProps {
  selectedBadges: string[];
  onToggle: (badgeId: string) => void;
  maxBadges?: number;
}

export const BadgeSelector = ({ selectedBadges, onToggle, maxBadges = 3 }: BadgeSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMO_BADGES.map((badge) => {
        const isSelected = selectedBadges.includes(badge.id);
        const isDisabled = !isSelected && selectedBadges.length >= maxBadges;
        const Icon = badge.icon;

        return (
          <button
            key={badge.id}
            onClick={() => !isDisabled && onToggle(badge.id)}
            disabled={isDisabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              isSelected
                ? "ring-2 ring-primary"
                : isDisabled
                ? "opacity-40 cursor-not-allowed"
                : "opacity-70 hover:opacity-100"
            )}
            style={{
              background: badge.bgColor,
              color: badge.textColor,
              boxShadow: isSelected ? `0 0 12px ${badge.glowColor}` : undefined,
            }}
          >
            <Icon className="w-3 h-3" />
            <span>{badge.label}</span>
          </button>
        );
      })}
    </div>
  );
};
