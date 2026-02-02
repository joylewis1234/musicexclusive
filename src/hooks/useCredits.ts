import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const prevCreditsRef = useRef<number>(0);

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
        prevCreditsRef.current = credits;
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
  }, [user?.email, user?.user_metadata?.display_name, credits]);

  // Refetch with retry - useful after Stripe webhook processing
  const refetchWithRetry = useCallback(async (expectedIncrease?: number, maxRetries = 5, delayMs = 1500) => {
    const startCredits = credits;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await fetchCredits();
      
      // If we have an expected increase, check if credits updated
      if (expectedIncrease !== undefined) {
        // Small delay to allow state to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-fetch to get latest value
        const { data } = await supabase
          .from("vault_members")
          .select("credits")
          .eq("email", user?.email || "")
          .maybeSingle();
        
        if (data && data.credits >= startCredits + expectedIncrease) {
          setCredits(data.credits);
          console.log(`[useCredits] Credits updated after ${attempt + 1} attempts: ${data.credits}`);
          return true;
        }
      } else {
        // No expected increase, just return after first fetch
        return true;
      }
      
      // Wait before retrying (webhook may still be processing)
      if (attempt < maxRetries - 1) {
        console.log(`[useCredits] Retry ${attempt + 1}/${maxRetries}, waiting ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.log("[useCredits] Max retries reached, credits may not have updated yet");
    return false;
  }, [credits, fetchCredits, user?.email]);

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

  return { credits, loading, addCredits, refetch: fetchCredits, refetchWithRetry };
};
