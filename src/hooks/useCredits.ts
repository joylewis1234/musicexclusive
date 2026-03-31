import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchVaultMemberRow } from "@/lib/vaultMemberLookup";

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const prevCreditsRef = useRef<number>(0);

  const fetchCredits = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await fetchVaultMemberRow(
        supabase,
        { id: user.id, email: user.email },
        "credits",
      );

      if (error) {
        console.error("Error fetching credits:", error);
      } else if (data) {
        prevCreditsRef.current = credits;
        setCredits(data.credits);
      } else {
        // No vault_members record — create via edge function
        const { error: fnError } = await supabase.functions.invoke(
          "ensure-vault-member"
        );
        if (fnError) {
          console.error("Error ensuring vault member:", fnError);
        }
        setCredits(0);
      }
    } catch (err) {
      console.error("Error fetching credits:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, credits]);

  // Refetch with retry - useful after Stripe webhook processing
  const refetchWithRetry = useCallback(async (expectedIncrease?: number, maxRetries = 5, delayMs = 1500) => {
    const startCredits = credits;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await fetchCredits();
      
      if (expectedIncrease !== undefined) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        return true;
      }
      
      if (attempt < maxRetries - 1) {
        console.log(`[useCredits] Retry ${attempt + 1}/${maxRetries}, waiting ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.log("[useCredits] Max retries reached, credits may not have updated yet");
    return false;
  }, [credits, fetchCredits, user?.id, user?.email]);

  const addCredits = async (amount: number, usd: number): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      const { data, error } = await supabase.functions.invoke(
        "apply-credit-topup",
        { body: { credits: amount, usd } }
      );

      if (error) {
        console.error("Error adding credits:", error);
        return false;
      }

      if (data?.success) {
        setCredits(data.newBalance);
        return true;
      }

      console.error("Credit topup failed:", data);
      return false;
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
