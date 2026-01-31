import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFanTermsAgreement = () => {
  const { user } = useAuth();
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkAcceptance = async () => {
      if (!user?.id) {
        setIsLoading(false);
        setHasAccepted(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("fan_terms_acceptances")
          .select("id")
          .eq("user_id", user.id)
          .eq("agreement_type", "fan_terms")
          .maybeSingle();

        if (error) {
          console.error("Error checking fan terms acceptance:", error);
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

    checkAcceptance();
  }, [user?.id]);

  const acceptTerms = async (): Promise<boolean> => {
    if (!user?.id) {
      console.error("No user ID available");
      return false;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("fan_terms_acceptances")
        .insert({
          user_id: user.id,
          agreement_type: "fan_terms",
          version: "MVP_v1",
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error("Error saving fan terms acceptance:", error);
        return false;
      }

      setHasAccepted(true);
      return true;
    } catch (err) {
      console.error("Error in acceptTerms:", err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    hasAccepted,
    isLoading,
    isSubmitting,
    acceptTerms,
  };
};
