import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CURRENT_AGREEMENT_VERSION = "MVP_v1";

export const useArtistAgreement = () => {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAcceptance();
  }, []);

  const checkAcceptance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setHasAccepted(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("artist_agreement_acceptances")
        .select("id")
        .eq("artist_id", session.user.id)
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return false;
      }

      const { error } = await supabase
        .from("artist_agreement_acceptances")
        .insert({
          artist_id: session.user.id,
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
