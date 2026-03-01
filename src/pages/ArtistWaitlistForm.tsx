import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ArtistWaitlistForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [form, setForm] = useState({
    artist_name: "",
    email: "",
    instagram: "",
    other_social: "",
    genre: "",
    monthly_listeners: "",
    location: "",
    music_link: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.artist_name.trim() || !form.email.trim() || !form.location.trim() || !form.music_link.trim()) {
      toast({ title: "Missing fields", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }

    if (!agreedTerms) {
      toast({ title: "Terms required", description: "You must agree to the terms to continue.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-waitlist-application", {
        body: form,
      });

      if (error) throw error;

      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result?.error) {
        toast({ title: "Submission failed", description: result.error, variant: "destructive" });
        return;
      }

      navigate("/artist-waitlist/submitted");
    } catch (err: any) {
      console.error("[WaitlistForm] Submit error:", err);
      toast({
        title: "Something went wrong",
        description: err?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="container max-w-lg mx-auto">
          <GlowCard className="p-6 mb-6">
            <SectionHeader title="Join the Artist Waitlist" align="center" />
            <p className="text-center text-muted-foreground text-sm mt-2">
              Apply to become a Founding Artist on Music Exclusive.
            </p>
          </GlowCard>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="artist_name">Artist / Band Name *</Label>
              <Input
                id="artist_name"
                value={form.artist_name}
                onChange={(e) => handleChange("artist_name", e.target.value)}
                placeholder="Your artist name"
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="you@example.com"
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">What State/Country do you live in? *</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g. California, USA"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="music_link">Where can we listen to your music? *</Label>
              <Input
                id="music_link"
                value={form.music_link}
                onChange={(e) => handleChange("music_link", e.target.value)}
                placeholder="Spotify, Apple Music, SoundCloud, YouTube link"
                maxLength={500}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={form.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                placeholder="@yourhandle"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_social">Other Social Links</Label>
              <Input
                id="other_social"
                value={form.other_social}
                onChange={(e) => handleChange("other_social", e.target.value)}
                placeholder="TikTok, Twitter, YouTube, etc."
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                value={form.genre}
                onChange={(e) => handleChange("genre", e.target.value)}
                placeholder="e.g. Hip Hop, R&B, Pop"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_listeners">Monthly Listener Estimate</Label>
              <Input
                id="monthly_listeners"
                value={form.monthly_listeners}
                onChange={(e) => handleChange("monthly_listeners", e.target.value)}
                placeholder="e.g. 5,000"
                maxLength={50}
              />
            </div>

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="terms"
                checked={agreedTerms}
                onCheckedChange={(v) => setAgreedTerms(v === true)}
              />
              <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the Music Exclusive{" "}
                <a href="/terms" target="_blank" className="text-primary underline">Terms of Service</a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a>.
              </Label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ArtistWaitlistForm;
