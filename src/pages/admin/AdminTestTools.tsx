import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, FlaskConical, Loader2, Zap } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArtistProfile {
  user_id: string;
  artist_name: string;
}

// Split rules
const CREDIT_USD_RATE = 0.20; // 1 credit = $0.20
const ARTIST_SHARE = 0.5; // artist earns 0.5 credits per stream
const PLATFORM_SHARE = 0.5; // platform earns 0.5 credits per stream

export default function AdminTestTools() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string>("");
  const [streamCount, setStreamCount] = useState<number>(100);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);

  useEffect(() => {
    checkAdminRole();
    fetchArtists();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      setIsCheckingRole(false);
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
    setIsCheckingRole(false);
  };

  const fetchArtists = async () => {
    setIsLoadingArtists(true);
    const { data, error } = await supabase
      .from("artist_profiles")
      .select("user_id, artist_name")
      .order("artist_name");

    if (!error && data) {
      setArtists(data);
    }
    setIsLoadingArtists(false);
  };

  const generateTestEarnings = async () => {
    if (!selectedArtist) {
      toast.error("Please select an artist");
      return;
    }

    if (streamCount < 1) {
      toast.error("Stream count must be at least 1");
      return;
    }

    setIsGenerating(true);

    try {
      const artist = artists.find((a) => a.user_id === selectedArtist);
      if (!artist) throw new Error("Artist not found");

      // Get artist profile ID (needed for stream_ledger.artist_id)
      const { data: artistProfile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("user_id", selectedArtist)
        .single();

      if (profileError || !artistProfile) {
        throw new Error("Artist profile not found");
      }

      // Create a timestamp within the date range (middle of the range)
      const midDate = new Date(
        (dateRange.from.getTime() + dateRange.to.getTime()) / 2
      );

      // Create stream_ledger entries (this is what the payout system uses)
      const streamEntries = [];
      for (let i = 0; i < streamCount; i++) {
        streamEntries.push({
          artist_id: artistProfile.id,
          fan_id: "00000000-0000-0000-0000-000000000000", // placeholder test fan
          fan_email: `test-fan-${i}@test.internal`,
          track_id: "00000000-0000-0000-0000-000000000000", // placeholder track
          credits_spent: 1,
          amount_artist: 0.10,
          amount_platform: 0.10,
          amount_total: 0.20,
          payout_status: "pending",
          created_at: midDate.toISOString(),
        });
      }

      const { error } = await supabase.from("stream_ledger").insert(streamEntries);

      if (error) throw error;

      const artistUsd = streamCount * 0.10;
      toast.success(
        `Generated ${streamCount} test streams → ${artist.artist_name} will earn $${artistUsd.toFixed(2)}`
      );

      // Reset form
      setStreamCount(100);
    } catch (error) {
      console.error("Error generating test earnings:", error);
      toast.error(`Failed to generate test earnings: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <GlowCard className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access admin test tools.
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </GlowCard>
      </div>
    );
  }

  const artistUsdPreview = streamCount * 0.10; // $0.10 per stream for artist

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/reports")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Admin Test Tools</h1>
          </div>
        </div>

        {/* Generate Test Artist Earnings */}
        <GlowCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-semibold">Generate Test Artist Earnings</h2>
          </div>

          {/* Split Rules Display */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Split Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credit Value:</span>
                <span className="font-mono">1 credit = $0.20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fan Pays:</span>
                <span className="font-mono">1 credit per stream</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Artist Earns:</span>
                <span className="font-mono text-green-400">0.5 credits per stream</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Earns:</span>
                <span className="font-mono text-blue-400">0.5 credits per stream</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Artist Selector */}
            <div className="space-y-2">
              <Label>Select Artist</Label>
              <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an artist..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingArtists ? (
                    <div className="p-2 text-center text-muted-foreground">
                      Loading artists...
                    </div>
                  ) : artists.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      No artists found
                    </div>
                  ) : (
                    artists.map((artist) => (
                      <SelectItem key={artist.user_id} value={artist.user_id}>
                        {artist.artist_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Stream Count */}
            <div className="space-y-2">
              <Label>Number of Chargeable Streams</Label>
              <Input
                type="number"
                min={1}
                value={streamCount}
                onChange={(e) => setStreamCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="font-mono"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range (Week)</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateRange.from, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => {
                        if (date) {
                          setDateRange({
                            from: startOfWeek(date, { weekStartsOn: 1 }),
                            to: endOfWeek(date, { weekStartsOn: 1 }),
                          });
                        }
                      }}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <span className="flex items-center text-muted-foreground">to</span>
                <Button variant="outline" className="flex-1 justify-start" disabled>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecting a date will auto-select the full week (Mon–Sun)
              </p>
            </div>

            {/* Preview */}
            {selectedArtist && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Preview</h3>
                <p className="text-lg">
                  <span className="font-mono text-primary">{streamCount}</span> streams →{" "}
                  <span className="font-mono text-green-400">
                    ${artistUsdPreview.toFixed(2)}
                  </span>{" "}
                  for artist (will appear in stream_ledger for payout aggregation)
                </p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={generateTestEarnings}
              disabled={isGenerating || !selectedArtist}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  GENERATE TEST EARNINGS
                </>
              )}
            </Button>
          </div>
        </GlowCard>

        {/* Quick Links */}
        <div className="mt-6 flex gap-4 flex-wrap">
          <Button variant="outline" onClick={() => navigate("/admin/reports")}>
            View Admin Reports
          </Button>
        </div>
      </div>
    </div>
  );
}
