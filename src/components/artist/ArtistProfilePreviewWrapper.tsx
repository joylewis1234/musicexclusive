import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Wrapper that redirects artists to their own profile page using the artistId.
 * This allows artists to preview their profile using the same ArtistProfile component
 * that fans see, maintaining UI consistency.
 */
export const ArtistProfilePreviewWrapper = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArtistProfileId = async () => {
      if (!user?.id) {
        navigate("/artist/dashboard");
        return;
      }

      try {
        // Get the artist's profile ID
        const { data: profile } = await supabase
          .from("artist_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          // Redirect to the artist view route with their profile ID
          navigate(`/artist/view/${profile.id}?view=fan`, { 
            replace: true,
            state: { fromRoute: "/artist/dashboard" }
          });
        } else {
          // No profile found, redirect to dashboard
          navigate("/artist/dashboard");
        }
      } catch (error) {
        console.error("Error fetching artist profile:", error);
        navigate("/artist/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistProfileId();
  }, [user?.id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return null;
};

export default ArtistProfilePreviewWrapper;
