import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, X, Home, HelpCircle, KeyRound, Star, LogIn, Music, FlaskConical, Wrench, Receipt, Crown, FileText, Shield, Copyright } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { NavLink } from "@/components/NavLink"

const mainNavItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "How It Works", href: "/#how-it-works", icon: HelpCircle },
  { title: "Artist Benefits", href: "/artist-benefits", icon: Crown },
  { title: "Enter the Vault", href: "/vault/enter", icon: KeyRound },
  { title: "Become a Superfan", href: "/auth/fan?flow=superfan", icon: Star },
  { title: "Artist Application", href: "/artist/apply", icon: Music },
  { title: "Terms of Use", href: "/terms", icon: FileText },
  { title: "Privacy Policy", href: "/privacy", icon: Shield },
  { title: "Copyright & DMCA", href: "/dmca", icon: Copyright },
]

const testingNavItems = [
  { title: "Test Tools", href: "/testing/tools", icon: Wrench },
  { title: "Test Payouts & Reports", href: "/testing/payouts", icon: Receipt },
]

const Header = () => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleNavigation = (href: string) => {
    setOpen(false)
    
    // Handle hash links for same-page navigation
    if (href.startsWith("/#")) {
      const hash = href.substring(1) // Remove leading /
      if (window.location.pathname === "/") {
        // Already on home page, just scroll to section
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      } else {
        // Navigate to home page then scroll
        navigate("/")
        setTimeout(() => {
          const element = document.querySelector(hash)
          if (element) {
            element.scrollIntoView({ behavior: "smooth" })
          }
        }, 100)
      }
    } else {
      navigate(href)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
      <div className="container max-w-lg md:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Hamburger Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button 
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          
          <SheetContent 
            side="left" 
            className="w-[280px] bg-background border-r border-border/40 p-0"
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <span className="font-display text-xl font-bold tracking-widest uppercase">
                <span className="text-foreground">MUSIC </span>
                <span className="text-primary">EXCLUSIVE</span>
                <span className="text-muted-foreground text-[8px] align-super ml-0.5">™</span>
              </span>
              <button 
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Navigation */}
            <nav className="p-4">
              <ul className="space-y-1">
                {mainNavItems.map((item) => (
                  <li key={item.title}>
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 font-body text-sm text-left"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Divider */}
              <div className="my-4 border-t border-border/30" />

              {/* Testing Section */}
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <FlaskConical className="w-3 h-3" />
                Testing
              </p>
              <ul className="space-y-1 mb-4">
                {testingNavItems.map((item) => (
                  <li key={item.title}>
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 font-body text-sm text-left"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Divider */}
              <div className="my-4 border-t border-border/30" />

              {/* Auth Actions */}
              <ul className="space-y-1">
                <li>
                  <NavLink
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 font-body text-sm"
                    activeClassName="text-primary bg-primary/10"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Log In / Sign Up</span>
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Bottom CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/30 bg-background">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => handleNavigation("/vault/enter")}
              >
                Enter the Vault
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo (centered) */}
        <button 
          onClick={() => navigate("/")}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5"
        >
          {/* ME Monogram Badge */}
          <div 
            className="relative flex items-center justify-center w-[18px] h-[18px] rounded-full shrink-0 border border-primary/50"
            style={{
              background: 'hsla(var(--primary) / 0.15)',
              boxShadow: '0 0 6px hsla(var(--primary) / 0.4)',
            }}
          >
            <span className="text-[7px] font-display font-bold tracking-tight text-primary">
              ME
            </span>
          </div>
          <span className="font-display text-base font-bold tracking-widest uppercase whitespace-nowrap">
            <span className="text-foreground">MUSIC </span>
            <span className="text-primary">EXCLUSIVE</span>
            <span className="text-muted-foreground text-[6px] align-super ml-0.5">™</span>
          </span>
        </button>

        {/* Login Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 px-4 rounded-full text-xs"
          onClick={() => navigate("/login")}
        >
          Log In
        </Button>
      </div>
    </header>
  )
}

export { Header }
