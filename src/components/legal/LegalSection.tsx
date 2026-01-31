import { cn } from "@/lib/utils";

interface LegalSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const LegalSection = ({ title, children, className }: LegalSectionProps) => {
  return (
    <section className={cn("mb-8", className)}>
      {title && (
        <h2 className="text-base md:text-lg font-display font-semibold text-foreground mb-3 tracking-tight">
          {title}
        </h2>
      )}
      <div className="text-sm md:text-[15px] text-foreground/85 leading-[1.7] space-y-4">
        {children}
      </div>
    </section>
  );
};

export default LegalSection;
