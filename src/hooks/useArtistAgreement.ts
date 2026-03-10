import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CURRENT_AGREEMENT_VERSION = "1.0";

/** Wait for a valid auth session, retrying up to maxWaitMs */
async function waitForSession(maxWaitMs = 6000): Promise<{ userId: string; accessToken: string; email: string } | null> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id && data.session?.access_token && data.session?.user?.email) {
      return {
        userId: data.session.user.id,
        accessToken: data.session.access_token,
        email: data.session.user.email,
      };
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export const useArtistAgreement = () => {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    checkAcceptance();
  }, []);

  const checkAcceptance = async () => {
    try {
      const session = await waitForSession();
      const userId = session?.userId ?? null;
      if (!userId) {
        console.warn("[useArtistAgreement] No session after polling for checkAcceptance");
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
        console.error("[useArtistAgreement] Error checking agreement acceptance:", error);
        setHasAccepted(false);
      } else {
        setHasAccepted(!!data);
      }
    } catch (err) {
      console.error("[useArtistAgreement] Error in checkAcceptance:", err);
      setHasAccepted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptAgreement = async (params: {
    legalName: string;
    artistName: string;
  }): Promise<boolean> => {
    setIsSubmitting(true);
    setLastError(null);

    try {
      const session = await waitForSession(8000);

      if (!session) {
        console.error("[useArtistAgreement] No session after waiting");
        setLastError("Session not ready. Please wait a moment and try again.");
        return false;
      }

      const { userId, email } = session;
      console.log("[useArtistAgreement] Saving agreement for userId:", userId.substring(0, 8) + "...");

      const { data, error } = await supabase.functions.invoke("submit-agreement-acceptance", {
        body: {
          email,
          name: params.legalName,
          terms_version: CURRENT_AGREEMENT_VERSION,
          privacy_version: CURRENT_AGREEMENT_VERSION,
          artist_id: userId,
          legal_name: params.legalName,
          artist_name: params.artistName,
          agreement_version: CURRENT_AGREEMENT_VERSION,
          client_timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        console.error("[useArtistAgreement] ❌ Edge function error:", error);
        setLastError("Something went wrong. Please try again or contact support@musicexclusive.co");
        return false;
      }

      if (data?.error) {
        console.error("[useArtistAgreement] ❌ Server error:", data.error);
        setLastError(data.error);
        return false;
      }

      console.log("[useArtistAgreement] ✅ Agreement saved successfully");
      setHasAccepted(true);
      return true;
    } catch (err) {
      console.error("[useArtistAgreement] Unexpected error in acceptAgreement:", err);
      setLastError("Something went wrong. Please try again or contact support@musicexclusive.co");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    hasAccepted,
    isLoading,
    isSubmitting,
    lastError,
    acceptAgreement,
    currentVersion: CURRENT_AGREEMENT_VERSION,
  };
};
