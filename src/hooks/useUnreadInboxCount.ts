import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadInboxCount = () => {
  const [count, setCount] = useState(0);

  // Mock current user email (in real app, this would come from auth)
  const currentUserEmail = "alex@example.com";

  useEffect(() => {
    const fetchUnreadCount = async () => {
      // First, get the current user's vault member ID
      const { data: currentUser } = await supabase
        .from("vault_members")
        .select("id")
        .eq("email", currentUserEmail)
        .maybeSingle();

      if (!currentUser) {
        setCount(0);
        return;
      }

      // Count unread shared tracks (listened_at is null)
      const { count: unreadCount, error } = await supabase
        .from("shared_tracks")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", currentUser.id)
        .is("listened_at", null);

      if (error) {
        console.error("Error fetching unread count:", error);
        return;
      }

      setCount(unreadCount || 0);
    };

    fetchUnreadCount();

    // Subscribe to changes in shared_tracks for real-time updates
    const channel = supabase
      .channel("inbox-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_tracks",
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
};
