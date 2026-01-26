import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, X, Home, HelpCircle, KeyRound, Star, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { NavLink } from "@/components/NavLink"

const mainNavItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "How It Works", href: "/#how-it-works", icon: HelpCircle },
  { title: "Enter the Vault", href: "/vault/enter", icon: KeyRound },
  { title: "Superfan", href: "/choose-access", icon: Star },
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
              <span className="font-display text-lg font-bold tracking-wider">
                <span className="text-foreground">Music </span>
                <span className="text-primary">Exclusive</span>
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
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1"
        >
          <span className="font-display text-lg font-bold tracking-wider">
            <span className="text-foreground">Music </span>
            <span className="text-primary">Exclusive</span>
            <span className="text-muted-foreground text-[8px] align-super ml-0.5">™</span>
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
