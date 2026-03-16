import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/config/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/ui/GlowCard";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type PayoutStatus = "not_connected" | "pending" | "connected" | "paused";

interface PayoutSettingsProps {
  onStatusChange?: (status: PayoutStatus) => void;
}

const PayoutSettings = ({ onStatusChange }: PayoutSettingsProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PayoutStatus>("not_connected");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchPayoutStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from("artist_profiles")
        .select("stripe_account_id, payout_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[PayoutSettings] Error fetching profile:", error);
        return;
      }

      if (profile) {
        setStripeAccountId(profile.stripe_account_id);
        setStatus((profile.payout_status as PayoutStatus) || "not_connected");
        onStatusChange?.((profile.payout_status as PayoutStatus) || "not_connected");
      }
    } catch (err) {
      console.error("[PayoutSettings] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, onStatusChange]);

  useEffect(() => {
    fetchPayoutStatus();
  }, [fetchPayoutStatus]);

  const handleSetupPayout = async () => {
    if (!user) {
      toast.error("Please sign in to set up payouts");
      return;
    }

    setIsConnecting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            returnOrigin: window.location.origin,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payout account");
      }

      if (data.url) {
        // Open in new tab for mobile compatibility
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.open(data.url, "_blank");
        } else {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error("[PayoutSettings] Setup error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to set up payouts");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!user) return;

    setIsRefreshing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-connect-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify status");
      }

      setStatus(data.status as PayoutStatus);
      onStatusChange?.(data.status as PayoutStatus);
      setLastChecked(new Date());
      
      if (data.status === "connected") {
        toast.success("Payout account is ready!");
      } else if (data.status === "pending") {
        toast.info("Account setup in progress. Complete verification in Stripe.");
      }
    } catch (err) {
      console.error("[PayoutSettings] Refresh error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to refresh status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ready
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
            <Clock className="w-3 h-3 mr-1" />
            Pending Verification
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
            <AlertCircle className="w-3 h-3 mr-1" />
            Payouts Paused
          </Badge>
        );
      case "not_connected":
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            <XCircle className="w-3 h-3 mr-1" />
            Not Set Up
          </Badge>
        );
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case "connected":
        return "Your payout account is verified and ready to receive payments.";
      case "pending":
        return "Finish bank & ID verification in Stripe to start receiving payouts.";
      case "paused":
        return "Payouts are currently paused. Contact support if this is unexpected.";
      case "not_connected":
      default:
        return "Set up a payout account to receive your earnings via Stripe.";
    }
  };

  if (isLoading) {
    return (
      <GlowCard variant="flat" glowColor="subtle" className="p-5">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard variant="flat" glowColor="subtle" className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "hsla(280, 80%, 50%, 0.15)" }}
          >
            <Wallet className="w-5 h-5" style={{ color: "hsl(280, 80%, 70%)" }} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Payout Settings
            </h3>
            <p className="text-xs text-muted-foreground">Stripe Connect</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{getStatusDescription()}</p>

      <div className="flex flex-wrap gap-2">
        {status === "not_connected" && (
          <Button
            onClick={handleSetupPayout}
            disabled={isConnecting}
            className="bg-primary hover:bg-primary/90"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Set Up Payouts
              </>
            )}
          </Button>
        )}

        {status === "pending" && (
          <Button
            onClick={handleSetupPayout}
            disabled={isConnecting}
            variant="outline"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Continue Setup
              </>
            )}
          </Button>
        )}

        {status === "connected" && (
          <Button
            onClick={handleSetupPayout}
            disabled={isConnecting}
            variant="outline"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Account
              </>
            )}
          </Button>
        )}

        {(status === "pending" || status === "connected" || stripeAccountId) && (
          <Button
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </div>

      {lastChecked && (
        <p className="text-[10px] text-muted-foreground mt-3">
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      )}
    </GlowCard>
  );
};

export default PayoutSettings;
