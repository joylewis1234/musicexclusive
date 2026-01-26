import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("vault_members")
        .select("credits")
        .eq("email", user.email)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
      } else if (data) {
        setCredits(data.credits);
      } else {
        // No vault_members record exists - create one
        const displayName = user.user_metadata?.display_name || user.email.split("@")[0];
        const { error: insertError } = await supabase
          .from("vault_members")
          .insert({
            email: user.email,
            display_name: displayName,
            credits: 0,
            vault_access_active: true,
          });

        if (insertError && !insertError.message.includes("duplicate")) {
          console.error("Error creating vault member:", insertError);
        }
        setCredits(0);
      }
    } catch (err) {
      console.error("Error fetching credits:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.user_metadata?.display_name]);

  const addCredits = async (amount: number): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      // First, ensure vault member exists and get current credits
      const { data: currentData, error: fetchError } = await supabase
        .from("vault_members")
        .select("credits")
        .eq("email", user.email)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching current credits:", fetchError);
        return false;
      }

      let currentCredits = 0;

      if (!currentData) {
        // Create vault member record if it doesn't exist
        const displayName = user.user_metadata?.display_name || user.email.split("@")[0];
        const { error: insertError } = await supabase
          .from("vault_members")
          .insert({
            email: user.email,
            display_name: displayName,
            credits: amount,
            vault_access_active: true,
          });

        if (insertError) {
          console.error("Error creating vault member:", insertError);
          return false;
        }

        setCredits(amount);
        return true;
      }

      currentCredits = currentData.credits || 0;
      const newCredits = currentCredits + amount;

      // Update credits
      const { error: updateError } = await supabase
        .from("vault_members")
        .update({ credits: newCredits })
        .eq("email", user.email);

      if (updateError) {
        console.error("Error updating credits:", updateError);
        return false;
      }

      setCredits(newCredits);
      return true;
    } catch (err) {
      console.error("Error adding credits:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return { credits, loading, addCredits, refetch: fetchCredits };
};
