import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface LegalSectionProps {
  number?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showDivider?: boolean;
}

const LegalSection = ({ 
  number, 
  title, 
  children, 
  className,
  showDivider = true 
}: LegalSectionProps) => {
  return (
    <section className={cn("", className)}>
      {title && (
        <div className="flex items-baseline gap-3 mb-4">
          {number && (
            <span className="text-xs font-mono text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded">
              {number}
            </span>
          )}
          <h2 className="text-base md:text-[17px] font-semibold text-foreground tracking-tight">
            {title}
          </h2>
        </div>
      )}
      <div className="text-sm md:text-[15px] text-foreground/90 leading-[1.75] space-y-4 break-words">
        {children}
      </div>
      {showDivider && (
        <Separator className="mt-8 bg-border/30" />
      )}
    </section>
  );
};

export default LegalSection;
