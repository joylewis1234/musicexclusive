import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";

interface FanWaitlistEntry {
  id: string;
  first_name: string;
  email: string;
  favorite_genre: string | null;
  favorite_artist: string | null;
  status: string;
  created_at: string;
}

const AdminFanWaitlist = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FanWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from("fan_waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setEntries(data as unknown as FanWaitlistEntry[]);
      }
      setLoading(false);
    };
    fetchEntries();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Users className="w-5 h-5 text-primary" />
          <span className="font-display text-sm font-semibold uppercase tracking-widest">
            Fan Waitlist
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {entries.length} signups
          </span>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-5xl mx-auto">
          <SectionHeader title="Founding Superfan Signups" align="left" />

          {loading ? (
            <p className="text-muted-foreground text-sm mt-8">Loading…</p>
          ) : entries.length === 0 ? (
            <GlowCard className="p-8 mt-8 text-center">
              <p className="text-muted-foreground">No signups yet.</p>
            </GlowCard>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 px-3 font-medium">Name</th>
                    <th className="py-3 px-3 font-medium">Email</th>
                    <th className="py-3 px-3 font-medium">Genre</th>
                    <th className="py-3 px-3 font-medium">Artist</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 px-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-3 text-foreground">{entry.first_name}</td>
                      <td className="py-3 px-3 text-foreground">{entry.email}</td>
                      <td className="py-3 px-3 text-muted-foreground">{entry.favorite_genre || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground">{entry.favorite_artist || "—"}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminFanWaitlist;
