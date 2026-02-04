import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const Footer = () => {
  return (
    <footer className="px-4 py-12 border-t border-border/30">
      <div className="container max-w-lg md:max-w-xl mx-auto">
        {/* Legal Section */}
        <div className="text-center mb-8">
          <p className="text-primary/80 text-[11px] font-display uppercase tracking-[0.2em] mb-6">
            Legal
          </p>
          
          {/* 2-Column Grid of Legal Links */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
            <Link 
              to="/terms" 
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
            >
              <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-foreground/90 text-xs font-medium">Terms of Use</span>
            </Link>
            <Link 
              to="/privacy" 
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
            >
              <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-foreground/90 text-xs font-medium">Privacy Policy</span>
            </Link>
            <Link 
              to="/dmca" 
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
            >
              <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-foreground/90 text-xs font-medium">Copyright & DMCA</span>
            </Link>
            <Link 
              to="/refunds" 
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
            >
              <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-foreground/90 text-xs font-medium">Refund Policy</span>
            </Link>
            <Link 
              to="/artist-agreement" 
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group col-span-2"
            >
              <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-foreground/90 text-xs font-medium">Artist Participation Agreement</span>
            </Link>
            <Link 
              to="/patent-notice" 
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group col-span-2"
            >
              <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-foreground/90 text-xs font-medium">Patent Notice</span>
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-6" />

        {/* Patent Pending Notice */}
        <p className="text-center text-[11px] text-muted-foreground/70 font-display tracking-wider">
          Music Exclusive™ | Patent Pending
        </p>
        
        {/* Copyright Statement */}
        <p className="text-center text-[10px] text-muted-foreground/50 mt-3">
          © {new Date().getFullYear()} Music Exclusive LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
