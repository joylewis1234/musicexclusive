import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const AgreementStatusCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["artist-agreement-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_agreement_acceptances")
        .select("signed_at, agreement_version, legal_name")
        .eq("artist_id", user!.id)
        .order("signed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-2xl" />;
  }

  const isSigned = !!data?.signed_at;

  return (
    <Card
      className="p-4 rounded-2xl border"
      style={{
        background: "hsla(0, 0%, 100%, 0.02)",
        borderColor: isError
          ? "hsl(var(--muted))"
          : isSigned
            ? "hsl(142, 71%, 45%)"
            : "hsl(45, 93%, 47%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{
              background: isError
                ? "hsla(0, 0%, 50%, 0.15)"
                : isSigned
                  ? "hsla(142, 71%, 45%, 0.15)"
                  : "hsla(45, 93%, 47%, 0.15)",
            }}
          >
            <FileText
              className="w-5 h-5"
              style={{
                color: isError
                  ? "hsl(var(--muted-foreground))"
                  : isSigned
                    ? "hsl(142, 71%, 45%)"
                    : "hsl(45, 93%, 47%)",
              }}
            />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Artist Participation Agreement
              </h3>
              {!isError && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={
                    isSigned
                      ? {
                          background: "hsla(142, 71%, 45%, 0.15)",
                          color: "hsl(142, 71%, 45%)",
                        }
                      : {
                          background: "hsla(45, 93%, 47%, 0.15)",
                          color: "hsl(45, 93%, 47%)",
                        }
                  }
                >
                  {isSigned ? "Signed" : "Pending"}
                </span>
              )}
            </div>

            {isError ? (
              <p className="text-xs text-muted-foreground">
                Unable to load agreement status. Contact support@musicexclusive.co
              </p>
            ) : isSigned ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Signed on: {format(new Date(data.signed_at!), "MMMM dd, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Version: {data.agreement_version}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                You haven't signed your artist agreement yet.
              </p>
            )}
          </div>
        </div>

        {!isError && (
          <div className="shrink-0">
            {isSigned ? (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full w-9 h-9 p-0"
                title="Download Signed Copy"
                onClick={() => window.open("/artist-agreement", "_blank")}
              >
                <Download className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="accent"
                className="text-xs px-4"
                onClick={() => navigate("/artist/agreement-accept")}
              >
                <PenLine className="w-3.5 h-3.5 mr-1" />
                Sign
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AgreementStatusCard;
