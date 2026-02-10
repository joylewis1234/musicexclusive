import ArtistInviteSection from "@/components/artist/ArtistInviteSection";
import { useArtistProfile } from "@/hooks/useArtistProfile";
import { Loader2 } from "lucide-react";

const ArtistInvites = () => {
  const { artistProfile, artistProfileId, isLoading } = useArtistProfile();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg mx-auto px-4 h-14 flex items-center">
          <h1 className="font-display text-lg font-bold text-foreground">Fan Invites</h1>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : artistProfileId ? (
          <ArtistInviteSection artistProfileId={artistProfileId} />
        ) : (
          <p className="text-muted-foreground text-center py-20">Artist profile not found.</p>
        )}
      </main>
    </div>
  );
};

export default ArtistInvites;
