import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  Upload, 
  Music, 
  Users, 
  TrendingUp,
  Settings,
  LogOut,
  Mic2
} from "lucide-react";

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Mock stats - would come from database
  const stats = {
    totalTracks: 3,
    totalStreams: 2879,
    totalEarnings: 575.80,
    followers: 142,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-accent" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Artist Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Welcome Back, Artist
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your music and connect with fans
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <GlowCard className="p-4 text-center">
              <Music className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">
                {stats.totalTracks}
              </p>
              <p className="text-muted-foreground text-xs">Tracks</p>
            </GlowCard>
            
            <GlowCard className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">
                {stats.totalStreams.toLocaleString()}
              </p>
              <p className="text-muted-foreground text-xs">Streams</p>
            </GlowCard>
            
            <GlowCard className="p-4 text-center">
              <Users className="w-5 h-5 text-accent mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">
                {stats.followers}
              </p>
              <p className="text-muted-foreground text-xs">Followers</p>
            </GlowCard>
            
            <GlowCard className="p-4 text-center">
              <div className="w-5 h-5 text-green-500 mx-auto mb-2 font-bold">$</div>
              <p className="font-display text-2xl font-bold text-green-500">
                ${stats.totalEarnings.toFixed(2)}
              </p>
              <p className="text-muted-foreground text-xs">Earnings</p>
            </GlowCard>
          </div>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" align="left" className="mb-4" />
          
          <div className="space-y-3 mb-8">
            <Button 
              variant="outline" 
              className="w-full justify-start h-14"
              onClick={() => navigate("/artist/upload")}
            >
              <Upload className="w-5 h-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-semibold">Upload New Track</p>
                <p className="text-xs text-muted-foreground">Share exclusive music</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-14"
              onClick={() => navigate("/artist/profile")}
            >
              <Mic2 className="w-5 h-5 mr-3 text-accent" />
              <div className="text-left">
                <p className="font-semibold">View Profile</p>
                <p className="text-xs text-muted-foreground">See how fans see you</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-14"
              onClick={() => navigate("/artist/settings")}
            >
              <Settings className="w-5 h-5 mr-3 text-muted-foreground" />
              <div className="text-left">
                <p className="font-semibold">Settings</p>
                <p className="text-xs text-muted-foreground">Account preferences</p>
              </div>
            </Button>
          </div>

          {/* Recent Activity Placeholder */}
          <SectionHeader title="Recent Activity" align="left" className="mb-4" />
          
          <GlowCard className="p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Your recent streams and engagement will appear here.
            </p>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default ArtistDashboard;
