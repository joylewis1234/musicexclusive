import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StreamChargeResult {
  success: boolean;
  error?: string;
  requiresCredits?: boolean;
  newCredits?: number;
  alreadyCharged?: boolean;
}

const MAX_RETRIES = 5;
const BACKOFF_MS = [100, 250, 500, 1000, 2000];

async function invokeChargeStream(
  trackId: string,
  idempotencyKey: string
): Promise<{ data: any; error: any; status?: number }> {
  const { data, error } = await supabase.functions.invoke("charge-stream", {
    body: { trackId, idempotencyKey },
  });
  return { data, error };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useStreamCharge = (userEmail: string | null | undefined) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [chargedTracks, setChargedTracks] = useState<Set<string>>(new Set());

  const chargeStream = useCallback(async (
    trackId: string
  ): Promise<StreamChargeResult> => {
    if (!userEmail) {
      return { success: false, error: "Not logged in" };
    }

    setIsProcessing(true);

    try {
      // Generate idempotency key once — preserved across retries
      const idempotencyKey = crypto.randomUUID();
      let lastError: string | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
          await sleep(delay);
        }

        const { data, error } = await invokeChargeStream(trackId, idempotencyKey);

        // Handle edge function invocation errors
        if (error) {
          const message = error.message || "Something went wrong";

          // Check if it's a 409 (concurrent update) — retry
          if (message.includes("Concurrent update") || message.includes("409")) {
            lastError = message;
            console.warn(`[StreamCharge] 409 contention, retry ${attempt + 1}/${MAX_RETRIES}`);
            continue;
          }

          if (message.includes("Insufficient credits") || data?.requiresCredits) {
            toast.error("Insufficient credits", {
              description: "You need 1 credit to stream. Add credits to continue.",
            });
            return { success: false, error: "Insufficient credits", requiresCredits: true };
          }

          toast.error("Stream failed", { description: message });
          return { success: false, error: message };
        }

        // Handle structured error responses from edge function
        if (data?.error) {
          // 409 contention — retry with same idempotency key
          if (data.error === "Concurrent update, retry") {
            lastError = data.error;
            console.warn(`[StreamCharge] 409 contention, retry ${attempt + 1}/${MAX_RETRIES}`);
            continue;
          }

          if (data.requiresCredits) {
            toast.error("Insufficient credits", {
              description: "You need 1 credit to stream. Add credits to continue.",
            });
            return { success: false, error: data.error, requiresCredits: true };
          }

          toast.error("Stream failed", { description: data.error });
          return { success: false, error: data.error };
        }

        // Success path
        if (!data?.alreadyCharged) {
          toast.success("1 credit used • Enjoy 🎶");
        }

        setChargedTracks(prev => new Set(prev).add(trackId));

        return {
          success: true,
          newCredits: data?.newCredits,
          alreadyCharged: data?.alreadyCharged,
        };
      }

      // Exhausted retries
      console.error(`[StreamCharge] Exhausted ${MAX_RETRIES} retries for 409 contention`);
      toast.error("Stream failed", {
        description: "Server is busy. Please try again in a moment.",
      });
      return { success: false, error: lastError || "Max retries exceeded" };
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

  const clearCharged = useCallback((trackId: string) => {
    setChargedTracks(prev => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  }, []);

  return {
    chargeStream,
    isProcessing,
    hasBeenCharged: useCallback((trackId: string) => chargedTracks.has(trackId), [chargedTracks]),
    clearCharged,
  };
};
