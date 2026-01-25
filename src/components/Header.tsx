import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
      <div className="container max-w-lg md:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Menu Icon */}
        <button className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1">
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
