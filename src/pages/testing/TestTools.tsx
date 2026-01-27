import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, Info, UserPlus, ArrowRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Artist {
  id: string;
  user_id: string;
  artist_name: string;
}

interface GenerationResult {
  streams: number;
  artistCredits: number;
  artistUsd: number;
  platformCredits: number;
  platformUsd: number;
}

interface TestArtistResult {
  artist_name: string;
  email: string;
  user_id: string;
}

const TestTools = () => {
  const { toast } = useToast();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [streams, setStreams] = useState<number>(100);
  const [periodType, setPeriodType] = useState<"this-week" | "custom">("this-week");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Create Test Artist state
  const [testArtistName, setTestArtistName] = useState("");
  const [testArtistEmail, setTestArtistEmail] = useState("");
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);
  const [testArtistResult, setTestArtistResult] = useState<TestArtistResult | null>(null);

  // Calculate this week's date range (Monday to Sunday)
  const today = new Date();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    const { data, error } = await supabase
      .from("artist_profiles")
      .select("id, user_id, artist_name")
      .order("artist_name");

    if (error) {
      toast({
        title: "Error fetching artists",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setArtists(data || []);
  };

  const getSelectedArtist = () => {
    return artists.find((a) => a.id === selectedArtistId);
  };

  const getDateRange = () => {
    if (periodType === "this-week") {
      return { start: thisWeekStart, end: thisWeekEnd };
    }
    return { start: customDateRange.from, end: customDateRange.to };
  };

  const handleGenerate = async () => {
    const artist = getSelectedArtist();
    if (!artist) {
      toast({
        title: "Select an artist",
        description: "Please select an artist from the dropdown.",
        variant: "destructive",
      });
      return;
    }

    const dateRange = getDateRange();
    if (!dateRange.start || !dateRange.end) {
      toast({
        title: "Select date range",
        description: "Please select a valid date range.",
        variant: "destructive",
      });
      return;
    }

    if (streams <= 0) {
      toast({
        title: "Invalid streams",
        description: "Please enter a positive number of streams.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // Calculate earnings
      const artistCredits = Math.floor(streams * 0.5);
      const platformCredits = Math.floor(streams * 0.5);
      const artistUsd = artistCredits * 0.20;
      const platformUsd = platformCredits * 0.20;

      const periodRef = `test_generation_${format(dateRange.start, "yyyy-MM-dd")}_to_${format(dateRange.end, "yyyy-MM-dd")}`;

      // Insert ARTIST_EARNING ledger entry
      const { error: artistError } = await supabase.from("credit_ledger").insert({
        user_email: artist.artist_name, // Using artist name as identifier for test
        type: "ARTIST_EARNING",
        credits_delta: artistCredits,
        usd_delta: artistUsd,
        reference: periodRef,
      });

      if (artistError) throw artistError;

      // Insert PLATFORM_EARNING ledger entry
      const { error: platformError } = await supabase.from("credit_ledger").insert({
        user_email: "platform@musicexclusive.com",
        type: "PLATFORM_EARNING",
        credits_delta: platformCredits,
        usd_delta: platformUsd,
        reference: periodRef,
      });

      if (platformError) throw platformError;

      setResult({
        streams,
        artistCredits,
        artistUsd,
        platformCredits,
        platformUsd,
      });

      toast({
        title: "Test earnings generated",
        description: `Created ledger entries for ${streams} streams.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTestArtist = async () => {
    if (!testArtistName.trim()) {
      toast({
        title: "Enter artist name",
        description: "Please enter a name for the test artist.",
        variant: "destructive",
      });
      return;
    }

    if (!testArtistEmail.trim()) {
      toast({
        title: "Enter email",
        description: "Please enter an email for the test artist.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingArtist(true);
    setTestArtistResult(null);

    try {
      // Generate a test user_id (UUID)
      const testUserId = crypto.randomUUID();

      // Create artist_profiles record
      const { error: profileError } = await supabase.from("artist_profiles").insert({
        user_id: testUserId,
        artist_name: testArtistName.trim(),
        payout_status: "not_connected",
        bio: "Test artist created for development purposes.",
        genre: "Test",
      });

      if (profileError) throw profileError;

      // Create artist_applications record marked as active
      const { error: appError } = await supabase.from("artist_applications").insert({
        artist_name: testArtistName.trim(),
        contact_email: testArtistEmail.trim(),
        status: "active",
        primary_social_platform: "instagram",
        social_profile_url: "https://instagram.com/test",
        song_sample_url: "https://example.com/test.mp3",
        genres: "Test",
        years_releasing: "1-3",
        follower_count: 1000,
        owns_rights: true,
        not_released_publicly: true,
        agrees_terms: true,
      });

      if (appError) throw appError;

      setTestArtistResult({
        artist_name: testArtistName.trim(),
        email: testArtistEmail.trim(),
        user_id: testUserId,
      });

      // Refresh artists list
      await fetchArtists();

      toast({
        title: "Test artist created",
        description: `${testArtistName} has been created and marked as active.`,
      });

      // Clear inputs
      setTestArtistName("");
      setTestArtistEmail("");
    } catch (error: any) {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingArtist(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg md:max-w-2xl mx-auto px-4 pt-20 pb-8">
        <h1 className="text-2xl font-display font-bold mb-6">Test Tools</h1>

        {/* Generate Test Artist Earnings Section */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">
              Generate Test Artist Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rules Display */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Info className="w-4 h-4" />
                Earning Rules
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• 1 credit = $0.20</li>
                <li>• 1 stream = 1 credit charged to fan</li>
                <li>• Artist earns 0.5 credit per verified stream ($0.10)</li>
                <li>• Platform earns 0.5 credit per verified stream ($0.10)</li>
              </ul>
            </div>

            {/* Artist Selector */}
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
                <SelectTrigger id="artist" className="bg-background">
                  <SelectValue placeholder="Select an artist" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {artists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.artist_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chargeable Streams */}
            <div className="space-y-2">
              <Label htmlFor="streams">Chargeable Streams</Label>
              <Input
                id="streams"
                type="number"
                min={1}
                value={streams}
                onChange={(e) => setStreams(parseInt(e.target.value) || 0)}
                className="bg-background"
              />
            </div>

            {/* Period Selector */}
            <div className="space-y-2">
              <Label>Week/Period</Label>
              <Select
                value={periodType}
                onValueChange={(v) => setPeriodType(v as "this-week" | "custom")}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="this-week">
                    This Week ({format(thisWeekStart, "MMM d")} – {format(thisWeekEnd, "MMM d")})
                  </SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>

              {periodType === "custom" && (
                <div className="flex gap-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal bg-background",
                          !customDateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.from
                          ? format(customDateRange.from, "MMM d, yyyy")
                          : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.from}
                        onSelect={(date) =>
                          setCustomDateRange((prev) => ({ ...prev, from: date }))
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal bg-background",
                          !customDateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.to
                          ? format(customDateRange.to, "MMM d, yyyy")
                          : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.to}
                        onSelect={(date) =>
                          setCustomDateRange((prev) => ({ ...prev, to: date }))
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedArtistId}
              className="w-full"
              size="lg"
            >
              {isGenerating ? "Generating..." : "GENERATE TEST EARNINGS"}
            </Button>

            {/* Result Card */}
            {result && (
              <Card className="border-green-500/30 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-500 font-medium mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                    Test Earnings Generated
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chargeable Streams</span>
                      <span className="font-medium">{result.streams}</span>
                    </div>
                    <div className="border-t border-border/30 pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Artist Earned</span>
                        <span className="font-medium text-primary">
                          {result.artistCredits} credits (≈ ${result.artistUsd.toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Earned</span>
                      <span className="font-medium">
                        {result.platformCredits} credits (≈ ${result.platformUsd.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Create Test Artist Section */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create Test Artist (Temporary)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a test artist profile directly, bypassing the application approval flow.
              The artist will be marked as active immediately.
            </p>

            {/* Artist Name */}
            <div className="space-y-2">
              <Label htmlFor="testArtistName">Artist Name</Label>
              <Input
                id="testArtistName"
                placeholder="e.g. Test Artist One"
                value={testArtistName}
                onChange={(e) => setTestArtistName(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="testArtistEmail">Email</Label>
              <Input
                id="testArtistEmail"
                type="email"
                placeholder="e.g. testartist@example.com"
                value={testArtistEmail}
                onChange={(e) => setTestArtistEmail(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreateTestArtist}
              disabled={isCreatingArtist || !testArtistName.trim() || !testArtistEmail.trim()}
              className="w-full"
              size="lg"
            >
              {isCreatingArtist ? "Creating..." : "CREATE TEST ARTIST"}
            </Button>

            {/* Result Card */}
            {testArtistResult && (
              <Card className="border-green-500/30 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-500 font-medium mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                    Test Artist Created
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{testArtistResult.artist_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{testArtistResult.email}</span>
                    </div>
                    <div className="border-t border-border/30 pt-3">
                      <Link to="/artist/dashboard">
                        <Button variant="outline" className="w-full">
                          Go connect Stripe
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestTools;
