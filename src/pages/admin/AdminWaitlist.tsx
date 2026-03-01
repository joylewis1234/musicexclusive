import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimeoutSpinner } from "@/components/ui/TimeoutSpinner";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Home,
  LogOut,
  ChevronLeft,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const AdminWaitlist = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_waitlist")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (waitlistId: string) => {
      const { data, error } = await supabase.functions.invoke("approve-waitlist-artist", {
        body: { waitlistId },
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Artist approved", description: "Approval email sent." });
      queryClient.invalidateQueries({ queryKey: ["admin-waitlist"] });
    },
    onError: (err: any) => {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (waitlistId: string) => {
      const { data, error } = await supabase.functions.invoke("reject-waitlist-artist", {
        body: { waitlistId },
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Artist rejected", description: "Rejection email sent." });
      queryClient.invalidateQueries({ queryKey: ["admin-waitlist"] });
    },
    onError: (err: any) => {
      toast({ title: "Rejection failed", description: err.message, variant: "destructive" });
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  if (isLoading) {
    return <TimeoutSpinner page="AdminWaitlist" loadingMessage="Loading waitlist…" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Artist Waitlist
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <GlowCard className="p-6 mb-6">
            <SectionHeader title="Artist Waitlist Management" align="center" />
            <p className="text-center text-muted-foreground text-sm mt-2">
              {entries?.length || 0} total applications
            </p>
          </GlowCard>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Artist</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Instagram</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Genre</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Location</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Applied</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries?.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-muted/10">
                      <td className="p-3 font-semibold text-foreground">{entry.artist_name}</td>
                      <td className="p-3 text-muted-foreground">{entry.email}</td>
                      <td className="p-3 text-muted-foreground">{entry.instagram || "—"}</td>
                      <td className="p-3 text-muted-foreground">{entry.genre || "—"}</td>
                      <td className="p-3 text-muted-foreground">{entry.location}</td>
                      <td className="p-3 text-muted-foreground">{format(new Date(entry.created_at), "MMM d, yyyy")}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(entry.status)}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {entry.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                              onClick={() => approveMutation.mutate(entry.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => rejectMutation.mutate(entry.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {entries?.map((entry: any) => (
              <GlowCard key={entry.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{entry.artist_name}</h3>
                    <p className="text-xs text-muted-foreground">{entry.email}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(entry.status)}`}>
                    {entry.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  {entry.instagram && <p>IG: {entry.instagram}</p>}
                  {entry.genre && <p>Genre: {entry.genre}</p>}
                  <p>Location: {entry.location}</p>
                  <p>Applied: {format(new Date(entry.created_at), "MMM d, yyyy")}</p>
                </div>
                {entry.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-green-400 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => approveMutation.mutate(entry.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => rejectMutation.mutate(entry.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </GlowCard>
            ))}

            {entries?.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No waitlist applications yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminWaitlist;
