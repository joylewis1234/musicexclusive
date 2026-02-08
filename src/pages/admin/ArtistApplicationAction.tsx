import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const ArtistApplicationAction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [result, setResult] = useState<{
    action?: string;
    artistName?: string;
    error?: string;
  }>({});

  const token = searchParams.get("token");
  const actionType = location.pathname.includes("/approve") ? "approve" : "deny";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setResult({ error: "No token provided" });
      return;
    }

    processAction();
  }, [token]);

  const processAction = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/handle-application-action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            token,
            adminEmail: "email_link",
            baseUrl: window.location.origin,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setResult({
          action: data.action,
          artistName: data.artistName,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Action error:", error);
      setStatus("error");
      setResult({
        error: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <GlowCard className="max-w-md w-full p-8 text-center">
        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            <h1 className="text-xl font-display font-bold text-foreground mb-2">
              Processing...
            </h1>
            <p className="text-muted-foreground text-sm">
              Please wait while we process this action.
            </p>
          </>
        )}

        {status === "success" && result.action === "approved" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Artist Approved!
            </h1>
            <p className="text-muted-foreground mb-6">
              <strong className="text-foreground">{result.artistName}</strong> has been approved.
              <br />
              An approval email with setup instructions has been sent to the artist.
            </p>
            <Button onClick={() => navigate("/admin/artist-applications")} className="w-full">
              View All Applications
            </Button>
          </>
        )}

        {status === "success" && result.action === "denied" && (
          <>
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Application Denied
            </h1>
            <p className="text-muted-foreground mb-6">
              <strong className="text-foreground">{result.artistName}</strong>'s application has been denied.
              <br />
              A notification email has been sent to the artist.
            </p>
            <Button onClick={() => navigate("/admin/artist-applications")} className="w-full">
              View All Applications
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              {result.error?.includes("already been completed") ? "Already Processed" : "Action Failed"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {result.error || "This action could not be completed."}
            </p>
            {result.error?.includes("already been completed") && (
              <p className="text-sm text-muted-foreground mb-4">
                This approval link was already clicked. No further action is needed.
              </p>
            )}
            <div className="space-y-3">
              <Button onClick={() => navigate("/admin/artist-applications")} className="w-full">
                Go to Admin Dashboard
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
                Return Home
              </Button>
            </div>
          </>
        )}
      </GlowCard>
    </div>
  );
};

export default ArtistApplicationAction;
