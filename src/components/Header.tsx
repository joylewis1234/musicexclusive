import { useState } from "react"
import { Menu, X, Home, HelpCircle, KeyRound, Star, User, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { NavLink } from "@/components/NavLink"

const mainNavItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "How It Works", href: "/#how-it-works", icon: HelpCircle },
  { title: "Enter the Vault", href: "/vault", icon: KeyRound },
  { title: "Superfan", href: "/superfan", icon: Star },
]

// Future dashboard items - can be conditionally rendered based on auth
const dashboardNavItems = [
  { title: "Fan Dashboard", href: "/fan-dashboard", icon: User },
  { title: "Artist Dashboard", href: "/artist-dashboard", icon: User },
  { title: "Profile", href: "/profile", icon: User },
]

const Header = () => {
  const [open, setOpen] = useState(false)

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
              <span className="font-display text-xl font-bold tracking-wider">
                <span className="text-foreground">M</span>
                <span className="text-primary">E</span>
                <span className="text-foreground">.</span>
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
                    <NavLink
                      to={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 font-body text-sm"
                      activeClassName="text-primary bg-primary/10"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
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

              {/* Future: Dashboard Items (conditionally rendered when authenticated) */}
              {/* 
              <div className="my-4 border-t border-border/30" />
              <p className="px-4 text-xs text-muted-foreground uppercase tracking-wider mb-2">Dashboard</p>
              <ul className="space-y-1">
                {dashboardNavItems.map((item) => (
                  <li key={item.title}>
                    <NavLink
                      to={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 font-body text-sm"
                      activeClassName="text-primary bg-primary/10"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
              */}
            </nav>

            {/* Bottom CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/30 bg-background">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Enter the Vault
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo (centered) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          <span className="font-display text-xl font-bold tracking-wider">
            <span className="text-foreground">M</span>
            <span className="text-primary">E</span>
            <span className="text-foreground">.</span>
          </span>
        </div>

        {/* Login Button */}
        <Button variant="outline" size="sm" className="h-9 px-4 rounded-full text-xs">
          Log In
        </Button>
      </div>
    </header>
  )
}

export { Header }
