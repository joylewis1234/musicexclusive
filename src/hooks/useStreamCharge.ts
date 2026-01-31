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
      // 1. Get fan's current credits and ID
      const { data: fanData, error: fanError } = await supabase
        .from("vault_members")
        .select("id, credits")
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

      // Get current user's auth ID for fan_id
      const { data: { user } } = await supabase.auth.getUser();
      const fanUserId = user?.id;

      if (!fanUserId) {
        return { success: false, error: "Not authenticated" };
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

      // 4. Create stream_ledger entry for detailed tracking
      // Extract artist_id from the artistEmail pattern or use the email
      const artistId = artistEmail.startsWith("artist_") 
        ? artistEmail.replace("@musicexclusive.com", "").replace("artist_", "")
        : artistEmail;

      await supabase.from("stream_ledger").insert({
        fan_id: fanUserId,
        fan_email: userEmail,
        artist_id: artistId,
        track_id: trackId,
        credits_spent: 1,
        amount_total: 0.20,
        amount_artist: 0.10,
        amount_platform: 0.10,
        payout_status: "pending",
      });

      // Mark as charged for this session
      chargedTracksRef.current.add(trackId);

      // Show encouraging toast
      toast.success("1 credit used • Enjoy 🎶");

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
