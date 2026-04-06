import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Sparkles, Music } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { warmFanAuthRoute } from "@/utils/preloadRoutes";

const InviteLanding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type");

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [inviterType, setInviterType] = useState("");

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setErrorMessage("No invite token provided.");
        setIsValidating(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("validate-fan-invite", {
          body: { token },
        });

        if (error) {
          setErrorMessage("Unable to validate invite. Please try again.");
          setIsValidating(false);
          return;
        }

        if (data?.valid) {
          setIsValid(true);
          setInviterType(data.inviter_type || type || "");
        } else {
          setErrorMessage(data?.error || "This invite link is not valid.");
        }
      } catch (err) {
        setErrorMessage("Something went wrong. Please try again.");
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [token, type]);

  useEffect(() => {
    if (isValid) {
      warmFanAuthRoute();
    }
  }, [isValid]);

  const handleAcceptInvite = () => {
    // Pass invite token through to auth flow
    warmFanAuthRoute();
    navigate(`/auth/fan?flow=invite&invite_token=${token}&invite_type=${inviterType}`);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <GlowCard className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Invalid Invite
          </h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-full">
            Go to Home
          </Button>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <GlowCard glowColor="gradient" className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          You've Been Invited!
        </h1>
        
        <p className="text-muted-foreground mb-2">
          {inviterType === "artist" 
            ? "An artist has invited you to join Music Exclusive!"
            : "A Superfan has shared their exclusive invite with you!"
          }
        </p>

        <p className="text-muted-foreground text-sm mb-8">
          Skip the Vault — create your account and start listening to exclusive music.
        </p>

        <div className="space-y-3">
          <Button onClick={handleAcceptInvite} size="lg" className="w-full">
            <Music className="w-4 h-4 mr-2" />
            Accept Invite & Get Started
          </Button>
        </div>

        {/* Patent Pending Notice */}
        <p className="mt-8 text-[10px] text-primary/60 font-display tracking-wider">
          Music Exclusive™ | Patent Pending
        </p>
      </GlowCard>
    </div>
  );
};

export default InviteLanding;
