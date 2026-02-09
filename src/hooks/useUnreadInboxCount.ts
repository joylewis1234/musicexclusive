import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadInboxCount = () => {
  const [count, setCount] = useState(0);
  const { user } = useAuth();
  const currentUserEmail = user?.email;

  useEffect(() => {
    if (!currentUserEmail) {
      setCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      const { data: currentUser } = await supabase
        .from("vault_members")
        .select("id")
        .eq("email", currentUserEmail)
        .maybeSingle();

      if (!currentUser) {
        setCount(0);
        return;
      }

      // Count unread shared tracks
      const { count: unreadTracks, error: trackError } = await supabase
        .from("shared_tracks")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", currentUser.id)
        .is("listened_at", null);

      if (trackError) {
        console.error("Error fetching unread track count:", trackError);
      }

      // Count unread shared artist profiles
      const { count: unreadArtists, error: artistError } = await supabase
        .from("shared_artist_profiles")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", currentUser.id)
        .is("viewed_at", null);

      if (artistError) {
        console.error("Error fetching unread artist count:", artistError);
      }

      setCount((unreadTracks || 0) + (unreadArtists || 0));
    };

    fetchUnreadCount();

    // Subscribe to changes for real-time updates
    const channel = supabase
      .channel("inbox-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_tracks" },
        () => fetchUnreadCount()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_artist_profiles" },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserEmail]);

  return count;
};
