import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
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
      }
    } catch (err) {
      console.error("Error fetching credits:", err);
    } finally {
      setLoading(false);
    }
  };

  const addCredits = async (amount: number): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      // First, get current credits
      const { data: currentData, error: fetchError } = await supabase
        .from("vault_members")
        .select("credits")
        .eq("email", user.email)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching current credits:", fetchError);
        return false;
      }

      const currentCredits = currentData?.credits || 0;
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
  }, [user?.email]);

  return { credits, loading, addCredits, refetch: fetchCredits };
};
