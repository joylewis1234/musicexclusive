import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StreamChargeResult {
  success: boolean;
  error?: string;
  requiresCredits?: boolean;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  requiresCredits?: boolean;
}

export const useStreamCharge = (userEmail: string | null | undefined) => {
  // Track which tracks have been charged in this session
  const chargedTracksRef = useRef<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Validate that the fan is allowed to stream:
   * 1. Must be in vault (vault_access_active = true)
   * 2. Must have enough credits (>= 1)
   * 
   * Note: Fan agreements are accepted during vault entry, so we don't check again here.
   */
  const validateStreamEligibility = useCallback(async (
    fanEmail: string
  ): Promise<ValidationResult> => {
    // Check vault membership and credits
    const { data: vaultMember, error: vaultError } = await supabase
      .from("vault_members")
      .select("id, credits, vault_access_active")
      .eq("email", fanEmail)
      .maybeSingle();

    if (vaultError) {
      console.error("Error checking vault membership:", vaultError);
      return { valid: false, error: "Could not verify vault access" };
    }

    if (!vaultMember) {
      return { valid: false, error: "You need vault access to stream" };
    }

    if (!vaultMember.vault_access_active) {
      return { valid: false, error: "Your vault access is not active" };
    }

    // Check credits
    if (vaultMember.credits < 1) {
      return { 
        valid: false, 
        error: "Insufficient credits",
        requiresCredits: true
      };
    }

    return { valid: true };
  }, []);

  const chargeStream = useCallback(async (
    trackId: string
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
      // Get current user's auth ID
      const { data: { user } } = await supabase.auth.getUser();
      const fanUserId = user?.id;

      if (!fanUserId) {
        return { success: false, error: "Not authenticated" };
      }

      // CRITICAL: Fetch the track to get the owner's artist_id
      const { data: trackData, error: trackError } = await supabase
        .from("tracks")
        .select("artist_id")
        .eq("id", trackId)
        .maybeSingle();

      if (trackError || !trackData) {
        console.error("Error fetching track owner:", trackError);
        return { success: false, error: "Could not verify track ownership" };
      }

      const trackOwnerArtistId = trackData.artist_id;

      // Run full validation
      const validation = await validateStreamEligibility(userEmail);
      
      if (!validation.valid) {
        if (validation.requiresCredits) {
          toast.error("Insufficient credits", {
            description: "You need 1 credit to stream. Add credits to continue."
          });
          return { 
            success: false, 
            error: validation.error,
            requiresCredits: true 
          };
        }
        
        toast.error("Stream failed", {
          description: validation.error
        });
        return { success: false, error: validation.error };
      }

      // 1. Get fan's current credits (re-fetch for atomicity)
      const { data: fanData, error: fanError } = await supabase
        .from("vault_members")
        .select("id, credits")
        .eq("email", userEmail)
        .maybeSingle();

      if (fanError || !fanData) {
        return { success: false, error: "Could not verify wallet balance" };
      }

      // Double-check credits again for race condition protection
      if (fanData.credits < 1) {
        toast.error("Insufficient credits", {
          description: "You need 1 credit to stream. Add credits to continue."
        });
        return { success: false, error: "Insufficient credits", requiresCredits: true };
      }

      // 2. Deduct 1 credit from fan (atomic operation)
      const { error: deductError } = await supabase
        .from("vault_members")
        .update({ credits: fanData.credits - 1 })
        .eq("email", userEmail)
        .eq("credits", fanData.credits); // Optimistic lock

      if (deductError) {
        console.error("Error deducting credit:", deductError);
        return { success: false, error: "Failed to process payment" };
      }

      // 3. Create ledger entries using the track owner's artist_id
      const streamReference = `stream_${trackId}_${Date.now()}`;

      // STREAM_DEBIT for fan
      await supabase.from("credit_ledger").insert({
        user_email: userEmail,
        type: "STREAM_DEBIT",
        credits_delta: -1,
        usd_delta: -0.20,
        reference: streamReference,
      });

      // ARTIST_EARNING - use track owner's artist_id
      // credits_delta is 0 because earnings are tracked in usd_delta, not as fan credits
      await supabase.from("credit_ledger").insert({
        user_email: trackOwnerArtistId,
        type: "ARTIST_EARNING",
        credits_delta: 0,
        usd_delta: 0.10,
        reference: streamReference,
      });

      // PLATFORM_EARNING
      // credits_delta is 0 because earnings are tracked in usd_delta, not as fan credits
      await supabase.from("credit_ledger").insert({
        user_email: "platform@musicexclusive.com",
        type: "PLATFORM_EARNING",
        credits_delta: 0,
        usd_delta: 0.10,
        reference: streamReference,
      });

      // 4. Create stream_ledger entry - artist_id is the track owner
      await supabase.from("stream_ledger").insert({
        fan_id: fanUserId,
        fan_email: userEmail,
        artist_id: trackOwnerArtistId,
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
      toast.error("Something went wrong", {
        description: "Please try again."
      });
      return { success: false, error: "Something went wrong" };
    } finally {
      setIsProcessing(false);
    }
  }, [userEmail, validateStreamEligibility]);

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
