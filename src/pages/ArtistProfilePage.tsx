import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { GlowCard } from "@/components/ui/GlowCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { 
  ArrowLeft, 
  Home, 
  Play, 
  Pause, 
  Music, 
  Upload,
  Edit2,
  Share2,
  Headphones
} from "lucide-react"
import artist1 from "@/assets/artist-1.jpg"

// Mock artist data - in production this would come from the database
const mockArtist = {
  id: "artist-1",
  name: "Maranda B.",
  genre: "Hip Hop / R&B",
  bio: "Atlanta-based artist blending soulful R&B with modern hip-hop production. Known for emotionally charged lyrics and innovative sound design. Featured on major playlists and collaborating with top producers.",
  imageUrl: artist1,
  status: "approved" as const,
}

// Mock tracks data
const mockTracks = [
  {
    id: "track-1",
    title: "Midnight Memories",
    releaseStatus: "exclusive",
    duration: "3:24",
    streams: 1420,
    hasHookPreview: true,
  },
  {
    id: "track-2",
    title: "Golden Hour",
    releaseStatus: "exclusive",
    duration: "4:02",
    streams: 892,
    hasHookPreview: true,
  },
  {
    id: "track-3",
    title: "Echoes",
    releaseStatus: "exclusive",
    duration: "3:45",
    streams: 567,
    hasHookPreview: false,
  },
]

const ArtistProfilePage = () => {
  const navigate = useNavigate()
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)

  // Check if artist is approved - redirect if not
  if (mockArtist.status !== "approved") {
    navigate("/artist/application-status")
    return null
  }

  const handlePlayPause = (trackId: string) => {
    setPlayingTrackId(playingTrackId === trackId ? null : trackId)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Artist Profile
          </span>

          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          
          {/* Artist Header Card */}
          <GlowCard className="p-0 overflow-hidden mb-6">
            {/* Cover Image Area */}
            <div className="relative h-32 bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/20">
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            </div>
            
            {/* Profile Content */}
            <div className="px-5 pb-5 -mt-12 relative">
              {/* Artist Image */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-card shadow-lg mb-4">
                <img
                  src={mockArtist.imageUrl}
                  alt={mockArtist.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Artist Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-1">
                    {mockArtist.name}
                  </h1>
                  <p className="text-muted-foreground text-sm font-body mb-3">
                    {mockArtist.genre}
                  </p>
                  <StatusBadge variant="exclusive" />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => navigate("/artist/profile/edit")}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </GlowCard>

          {/* Bio Section */}
          <GlowCard className="p-5 mb-6">
            <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-3">
              About
            </h3>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              {mockArtist.bio}
            </p>
          </GlowCard>

          {/* Stats Overview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <GlowCard className="p-4 text-center">
              <p className="font-display text-2xl font-bold text-foreground">
                {mockTracks.length}
              </p>
              <p className="text-muted-foreground text-xs font-body">Tracks</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="font-display text-2xl font-bold text-foreground">
                {mockTracks.reduce((acc, t) => acc + t.streams, 0).toLocaleString()}
              </p>
              <p className="text-muted-foreground text-xs font-body">Streams</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="font-display text-2xl font-bold text-primary">
                ${(mockTracks.reduce((acc, t) => acc + t.streams, 0) * 0.20).toFixed(2)}
              </p>
              <p className="text-muted-foreground text-xs font-body">Earned</p>
            </GlowCard>
          </div>

          {/* Music Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Your Music" align="left" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/artist/upload")}
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </div>

            <div className="space-y-3">
              {mockTracks.map((track) => (
                <GlowCard key={track.id} className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayPause(track.id)}
                      className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0"
                    >
                      {playingTrackId === track.id ? (
                        <Pause className="w-5 h-5 text-primary" />
                      ) : (
                        <Play className="w-5 h-5 text-primary ml-0.5" />
                      )}
                    </button>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-sm font-semibold text-foreground truncate">
                          {track.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-display uppercase tracking-wider flex-shrink-0">
                          Exclusive
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{track.duration}</span>
                        <span>•</span>
                        <span>{track.streams.toLocaleString()} streams</span>
                        {track.hasHookPreview && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-primary">
                              <Headphones className="w-3 h-3" />
                              Hook Preview
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Share Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                        <Share2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </GlowCard>
              ))}

              {mockTracks.length === 0 && (
                <GlowCard className="p-8 text-center">
                  <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm font-body mb-4">
                    No tracks uploaded yet
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/artist/upload")}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your First Track
                  </Button>
                </GlowCard>
              )}
            </div>
          </div>

          {/* Shareable Status Info */}
          <div className="bg-muted/20 border border-border/30 rounded-xl p-4 text-center">
            <Share2 className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-muted-foreground text-xs font-body">
              Your tracks can be shared by fans inside the Vault, helping you reach more listeners.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ArtistProfilePage
