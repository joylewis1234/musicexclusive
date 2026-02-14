import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CURRENT_AGREEMENT_VERSION = "MVP_v1";

/** Wait for a valid auth session, retrying up to maxWaitMs */
async function waitForSession(maxWaitMs = 6000): Promise<{ userId: string; accessToken: string } | null> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id && data.session?.access_token) {
      return { userId: data.session.user.id, accessToken: data.session.access_token };
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

/**
 * Fallback: try to get JWT directly from localStorage when getSession() stalls.
 */
function getTokenFromStorage(): { userId: string; accessToken: string } | null {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) return null;
    const key = `sb-${projectId}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.access_token || parsed?.currentSession?.access_token;
    // Decode JWT to get user ID
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.sub) {
        return { userId: payload.sub, accessToken: token };
      }
    }
  } catch (e) {
    console.warn("[useArtistAgreement] localStorage token extraction failed:", e);
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

  const acceptAgreement = async (): Promise<boolean> => {
    setIsSubmitting(true);
    setLastError(null);

    try {
      // Wait for session to be ready (critical on mobile after account creation)
      let session = await waitForSession(8000);

      // Fallback: extract token from localStorage if getSession stalls
      if (!session) {
        console.warn("[useArtistAgreement] getSession() failed, trying localStorage fallback");
        session = getTokenFromStorage();
      }

      if (!session) {
        console.error("[useArtistAgreement] No session after waiting + fallback");
        setLastError("Session not ready. Please wait a moment and try again.");
        return false;
      }

      const { userId, accessToken } = session;
      console.log("[useArtistAgreement] Saving agreement for userId:", userId.substring(0, 8) + "...");

      // Use direct REST API fetch with explicit auth headers for mobile reliability
      // This matches the pattern used in ArtistSetupAccount for Android Chrome
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      try {
        const resp = await fetch(
          `${supabaseUrl}/rest/v1/artist_agreement_acceptances`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              apikey: anonKey,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              artist_id: userId,
              agreement_version: CURRENT_AGREEMENT_VERSION,
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (resp.ok || resp.status === 201) {
          console.log("[useArtistAgreement] ✅ Agreement saved successfully");
          setHasAccepted(true);
          return true;
        }

        // Handle duplicate (already accepted)
        if (resp.status === 409) {
          console.log("[useArtistAgreement] Agreement already accepted (409 conflict)");
          setHasAccepted(true);
          return true;
        }

        // Parse error response
        let errorBody: any = null;
        try {
          errorBody = await resp.json();
        } catch {
          errorBody = await resp.text().catch(() => null);
        }

        const errorMsg = errorBody?.message || errorBody?.error || JSON.stringify(errorBody);
        console.error("[useArtistAgreement] ❌ Agreement save failed:", {
          status: resp.status,
          statusText: resp.statusText,
          body: errorBody,
        });

        // RLS violation
        if (resp.status === 403 || (typeof errorMsg === "string" && errorMsg.includes("row-level security"))) {
          setLastError("Permission denied. Please log out and log back in, then try again.");
          return false;
        }

        setLastError(`Save failed (${resp.status}): ${errorMsg}`);
        return false;
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        const isTimeout = fetchErr?.name === "AbortError";
        console.error("[useArtistAgreement] ❌ Fetch error:", fetchErr);
        setLastError(
          isTimeout
            ? "Request timed out. Please check your connection and try again."
            : "Network error. Please check your connection and try again."
        );
        return false;
      }
    } catch (err) {
      console.error("[useArtistAgreement] Unexpected error in acceptAgreement:", err);
      setLastError("An unexpected error occurred. Please try again.");
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
