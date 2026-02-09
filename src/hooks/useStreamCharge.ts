import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StreamChargeResult {
  success: boolean;
  error?: string;
  requiresCredits?: boolean;
  newCredits?: number;
}

export const useStreamCharge = (userEmail: string | null | undefined) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const chargeStream = useCallback(async (
    trackId: string
  ): Promise<StreamChargeResult> => {
    if (!userEmail) {
      return { success: false, error: "Not logged in" };
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("charge-stream", {
        body: { trackId },
      });

      if (error) {
        console.error("Stream charge error:", error);

        // Try to parse error body for structured response
        const message = error.message || "Something went wrong";

        if (message.includes("Insufficient credits") || data?.requiresCredits) {
          toast.error("Insufficient credits", {
            description: "You need 1 credit to stream. Add credits to continue.",
          });
          return { success: false, error: "Insufficient credits", requiresCredits: true };
        }

        toast.error("Stream failed", { description: message });
        return { success: false, error: message };
      }

      // Handle non-success responses from the edge function
      if (data?.error) {
        if (data.requiresCredits) {
          toast.error("Insufficient credits", {
            description: "You need 1 credit to stream. Add credits to continue.",
          });
          return { success: false, error: data.error, requiresCredits: true };
        }
        toast.error("Stream failed", { description: data.error });
        return { success: false, error: data.error };
      }

      toast.success("1 credit used • Enjoy 🎶");

      return {
        success: true,
        newCredits: data?.newCredits,
      };
    } catch (err) {
      console.error("Stream charge error:", err);
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
      return { success: false, error: "Something went wrong" };
    } finally {
      setIsProcessing(false);
    }
  }, [userEmail]);

  return {
    chargeStream,
    isProcessing,
    // Keep API compatible - hasBeenCharged always false now (every play charges)
    hasBeenCharged: (_trackId: string) => false,
  };
};
