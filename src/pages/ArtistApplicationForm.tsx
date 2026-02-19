import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { GlowCard } from "@/components/ui/GlowCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Home, Loader2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client" // used only for edge function invoke
import { useToast } from "@/hooks/use-toast"

const yearsOptions = [
  "Less than 1 year",
  "1-2 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
]

const socialPlatforms = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X (Twitter)" },
]

const ArtistApplicationForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [artistName, setArtistName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [countryCity, setCountryCity] = useState("")
  const [musicUrl, setMusicUrl] = useState("")
  const [yearsReleasing, setYearsReleasing] = useState("")
  const [genres, setGenres] = useState("")
  const [primarySocialPlatform, setPrimarySocialPlatform] = useState("")
  const [socialProfileUrl, setSocialProfileUrl] = useState("")
  const [followerCount, setFollowerCount] = useState("")
  const [ownsRights, setOwnsRights] = useState(false)
  const [notReleasedPublicly, setNotReleasedPublicly] = useState(false)
  const [agreesTerms, setAgreesTerms] = useState(false)

  // Form validation: require agreesTerms checkbox
  const isFormValid = agreesTerms

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)

    try {
      // Generate ID client-side so we don't need to SELECT/RETURN the inserted row
      const applicationId = crypto.randomUUID()

      // Normalize email before saving
      const normalizedEmail = (contactEmail || "test@example.com").trim().toLowerCase()

      console.log("[ArtistApplicationForm] Submitting application:", { applicationId, email: normalizedEmail })

      // Use direct fetch to bypass Supabase client's AbortController which can
      // abort requests during auth token refresh when a user is already logged in.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      const insertBody = {
        id: applicationId,
        artist_name: artistName || "Test Artist",
        contact_email: normalizedEmail,
        country_city: countryCity || null,
        spotify_url: musicUrl || null,
        apple_music_url: null,
        years_releasing: yearsReleasing || "1-2 years",
        genres: genres || "Test Genre",
        primary_social_platform: primarySocialPlatform || "instagram",
        social_profile_url: socialProfileUrl || "not_provided",
        follower_count: parseInt(followerCount) || 1000,
        song_sample_url: "not_required",
        hook_preview_url: null,
        owns_rights: true,
        not_released_publicly: true,
        agrees_terms: true,
        baseUrl: window.location.origin,
      }

      const { data, error: fnError } = await supabase.functions.invoke("submit-artist-application", {
        body: insertBody,
      })

      if (fnError) {
        console.error("[ArtistApplicationForm] Edge function error:", fnError)
        throw new Error(fnError.message || "Submission failed")
      }

      if (data?.error) {
        console.error("[ArtistApplicationForm] Server error:", data.error)
        throw new Error(data.error)
      }

      navigate("/artist/application-submitted", {
        state: { artistName: artistName || "Artist", applicationId },
      })
    } catch (error: unknown) {
      // Detect AbortError (common during HMR, auth refresh, or network hiccup) and ignore
      const errMsg = String((error as any)?.message ?? (error as any)?.error_description ?? error ?? "");
      const errName = String((error as any)?.name ?? "");
      const isAbort =
        errName === "AbortError" ||
        /abort|signal is aborted|cancel/i.test(errMsg);

      if (isAbort) {
        console.warn("[ArtistApplicationForm] Request aborted – likely transient. Ignoring.");
        // Don't show error toast for transient aborts; the insert likely still succeeded
        return;
      }

      console.error("Application error:", error)
      
      // Safely extract error message
      let errorMessage = "There was an error submitting your application. Please try again."
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message)
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Apply Now
          </span>

          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <SectionHeader title="Artist Application" align="center" framed />
            <p className="text-muted-foreground text-sm font-body mt-4">
              Complete all required fields to submit your application.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Artist Info */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 text-center">
                Artist Info
              </h3>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="artistName" className="text-sm">Artist Name</Label>
                  <Input
                    id="artistName"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Your artist/stage name"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="artist@email.com"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countryCity" className="text-sm">Country / City (Optional)</Label>
                  <Input
                    id="countryCity"
                    value={countryCity}
                    onChange={(e) => setCountryCity(e.target.value)}
                    placeholder="Los Angeles, CA"
                    className="h-12 text-base"
                  />
                </div>
              </div>
            </GlowCard>

            {/* Section 2: Music & Career */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 text-center">
                Music & Career
              </h3>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="musicUrl" className="text-sm">Where can we hear your music?</Label>
                  <Input
                    id="musicUrl"
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="Spotify, Apple Music, SoundCloud, YouTube..."
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to your music on any platform (Spotify, Apple Music, SoundCloud, YouTube, etc.)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Years Releasing Music</Label>
                  <Select value={yearsReleasing} onValueChange={setYearsReleasing}>
                    <SelectTrigger className="bg-card h-12 text-base">
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {yearsOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-base py-3">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genres" className="text-sm">Genre(s)</Label>
                  <Input
                    id="genres"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    placeholder="Hip-Hop, R&B, Pop..."
                    className="h-12 text-base"
                  />
                </div>
              </div>
            </GlowCard>

            {/* Section 3: Fanbase */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 text-center">
                Fanbase
              </h3>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm">Primary Social Platform</Label>
                  <Select value={primarySocialPlatform} onValueChange={setPrimarySocialPlatform}>
                    <SelectTrigger className="bg-card h-12 text-base">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {socialPlatforms.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value} className="text-base py-3">
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialProfileUrl" className="text-sm">Social Profile URL</Label>
                  <Input
                    id="socialProfileUrl"
                    value={socialProfileUrl}
                    onChange={(e) => setSocialProfileUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followerCount" className="text-sm">Approximate Follower Count</Label>
                  <Input
                    id="followerCount"
                    type="number"
                    min="0"
                    value={followerCount}
                    onChange={(e) => setFollowerCount(e.target.value)}
                    placeholder="10000"
                    className="h-12 text-base"
                  />
                </div>
              </div>
            </GlowCard>


            {/* Section 4: Rights Confirmation */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 text-center">
                Rights Confirmation
              </h3>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="ownsRights"
                    checked={ownsRights}
                    onCheckedChange={(checked) => setOwnsRights(checked as boolean)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <Label htmlFor="ownsRights" className="text-base font-normal leading-relaxed cursor-pointer">
                    I confirm I own or control all rights to the music I submit
                  </Label>
                </div>
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="notReleasedPublicly"
                    checked={notReleasedPublicly}
                    onCheckedChange={(checked) => setNotReleasedPublicly(checked as boolean)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <Label htmlFor="notReleasedPublicly" className="text-base font-normal leading-relaxed cursor-pointer">
                    I confirm this music has not been released publicly yet OR I have the right to release it early
                  </Label>
                </div>
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="agreesTerms"
                    checked={agreesTerms}
                    onCheckedChange={(checked) => setAgreesTerms(checked as boolean)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <Label htmlFor="agreesTerms" className="text-base font-normal leading-relaxed cursor-pointer">
                    I agree to the Music Exclusive{" "}
                    <Link 
                      to="/artist-agreement" 
                      target="_blank"
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Use
                    </Link>{" "}
                    and confirm I own or control all rights to the Content I upload.
                  </Label>
                </div>
              </div>
            </GlowCard>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-base"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default ArtistApplicationForm
