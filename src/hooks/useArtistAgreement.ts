import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CURRENT_AGREEMENT_VERSION = "MVP_v1";

/** Wait for a valid auth session, retrying up to maxWaitMs */
async function waitForSession(maxWaitMs = 6000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) return data.session.user.id;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export const useArtistAgreement = () => {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAcceptance();
  }, []);

  const checkAcceptance = async () => {
    try {
      const userId = await waitForSession();
      if (!userId) {
        setHasAccepted(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("artist_agreement_acceptances")
        .select("id")
        .eq("artist_id", userId)
        .eq("agreement_version", CURRENT_AGREEMENT_VERSION)
        .maybeSingle();

      if (error) {
        console.error("Error checking agreement acceptance:", error);
        setHasAccepted(false);
      } else {
        setHasAccepted(!!data);
      }
    } catch (err) {
      console.error("Error in checkAcceptance:", err);
      setHasAccepted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptAgreement = async (): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      // Wait for session to be ready (critical on mobile after account creation)
      const userId = await waitForSession(8000);
      if (!userId) {
        console.error("[acceptAgreement] No session after waiting");
        return false;
      }

      const { error } = await supabase
        .from("artist_agreement_acceptances")
        .insert({
          artist_id: userId,
          agreement_version: CURRENT_AGREEMENT_VERSION,
        });

      if (error) {
        // Check if it's a duplicate error (already accepted)
        if (error.code === "23505") {
          setHasAccepted(true);
          return true;
        }
        console.error("Error accepting agreement:", error);
        return false;
      }

      setHasAccepted(true);
      return true;
    } catch (err) {
      console.error("Error in acceptAgreement:", err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    hasAccepted,
    isLoading,
    isSubmitting,
    acceptAgreement,
    currentVersion: CURRENT_AGREEMENT_VERSION,
  };
};
