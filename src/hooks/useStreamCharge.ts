import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StreamChargeResult {
  success: boolean;
  error?: string;
}

export const useStreamCharge = (userEmail: string | null | undefined) => {
  // Track which tracks have been charged in this session
  const chargedTracksRef = useRef<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const chargeStream = useCallback(async (
    trackId: string,
    artistEmail: string
  ): Promise<StreamChargeResult> => {
    // Prevent duplicate charges in the same session
    if (chargedTracksRef.current.has(trackId)) {
      return { success: true }; // Already charged, no error
    }

    if (!userEmail) {
      return { success: false, error: "Not logged in" };
    }

    setIsProcessing(true);

    try {
      // 1. Get fan's current credits
      const { data: fanData, error: fanError } = await supabase
        .from("vault_members")
        .select("credits")
        .eq("email", userEmail)
        .maybeSingle();

      if (fanError || !fanData) {
        return { success: false, error: "Could not verify wallet balance" };
      }

      if (fanData.credits < 1) {
        toast.error("Insufficient credits", {
          description: "Add credits to continue streaming"
        });
        return { success: false, error: "Insufficient credits" };
      }

      // 2. Deduct 1 credit from fan
      const { error: deductError } = await supabase
        .from("vault_members")
        .update({ credits: fanData.credits - 1 })
        .eq("email", userEmail);

      if (deductError) {
        console.error("Error deducting credit:", deductError);
        return { success: false, error: "Failed to process payment" };
      }

      // 3. Create ledger entries
      const now = new Date().toISOString();
      const streamReference = `stream_${trackId}_${Date.now()}`;

      // STREAM_DEBIT for fan
      await supabase.from("credit_ledger").insert({
        user_email: userEmail,
        type: "STREAM_DEBIT",
        credits_delta: -1,
        usd_delta: -0.20,
        reference: streamReference,
      });

      // ARTIST_EARNING
      await supabase.from("credit_ledger").insert({
        user_email: artistEmail,
        type: "ARTIST_EARNING",
        credits_delta: 0.5,
        usd_delta: 0.10,
        reference: streamReference,
      });

      // PLATFORM_EARNING
      await supabase.from("credit_ledger").insert({
        user_email: "platform@musicexclusive.com",
        type: "PLATFORM_EARNING",
        credits_delta: 0.5,
        usd_delta: 0.10,
        reference: streamReference,
      });

      // Mark as charged for this session
      chargedTracksRef.current.add(trackId);

      // Show encouraging toast
      toast.success("Thank you for supporting this artist 💜", {
        description: "Your stream helps them grow."
      });

      return { success: true };
    } catch (error) {
      console.error("Stream charge error:", error);
      return { success: false, error: "Something went wrong" };
    } finally {
      setIsProcessing(false);
    }
  }, [userEmail]);

  const resetSessionCharges = useCallback(() => {
    chargedTracksRef.current.clear();
  }, []);

  return {
    chargeStream,
    isProcessing,
    resetSessionCharges,
    hasBeenCharged: (trackId: string) => chargedTracksRef.current.has(trackId),
  };
};
