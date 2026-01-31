import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ArtistProfile {
  id: string;
  artist_name: string;
  avatar_url: string | null;
  payout_status: string | null;
}

interface UseArtistProfileResult {
  artistProfile: ArtistProfile | null;
  artistProfileId: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to consistently get the artist's profile ID (artist_profiles.id)
 * linked to the current authenticated user (auth.user.id).
 * 
 * This ensures all artist-related queries use artist_profiles.id consistently:
 * - stream_ledger.artist_id
 * - tracks.artist_id
 * - payout_batches.artist_user_id (note: this one uses auth user id)
 */
export const useArtistProfile = (): UseArtistProfileResult => {
  const { user } = useAuth();
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setArtistProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First try to fetch existing profile
      const { data: profile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id, artist_name, avatar_url, payout_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("[useArtistProfile] Error fetching profile:", profileError);
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      // If no profile exists, auto-create one for the artist
      if (!profile) {
        console.log("[useArtistProfile] No profile found, creating one...");
        
        // Get artist name from user metadata or email
        const displayName = user.user_metadata?.display_name || 
                           user.email?.split("@")[0] || 
                           "Artist";

        const { data: newProfile, error: insertError } = await supabase
          .from("artist_profiles")
          .insert({
            user_id: user.id,
            artist_name: displayName,
          })
          .select("id, artist_name, avatar_url, payout_status")
          .single();

        if (insertError) {
          console.error("[useArtistProfile] Error creating profile:", insertError);
          setError("Could not create artist profile: " + insertError.message);
          setIsLoading(false);
          return;
        }

        console.log("[useArtistProfile] Profile created:", newProfile.id);
        setArtistProfile(newProfile);
      } else {
        setArtistProfile(profile);
      }
    } catch (err) {
      console.error("[useArtistProfile] Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    artistProfile,
    artistProfileId: artistProfile?.id || null,
    isLoading,
    error,
    refetch: fetchProfile,
  };
};
