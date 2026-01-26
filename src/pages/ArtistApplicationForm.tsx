import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { ArrowLeft, Home, Upload, Loader2, CheckCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
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
  const [spotifyUrl, setSpotifyUrl] = useState("")
  const [appleMusicUrl, setAppleMusicUrl] = useState("")
  const [yearsReleasing, setYearsReleasing] = useState("")
  const [genres, setGenres] = useState("")
  const [primarySocialPlatform, setPrimarySocialPlatform] = useState("")
  const [socialProfileUrl, setSocialProfileUrl] = useState("")
  const [followerCount, setFollowerCount] = useState("")
  const [songSampleFile, setSongSampleFile] = useState<File | null>(null)
  const [hookPreviewFile, setHookPreviewFile] = useState<File | null>(null)
  const [ownsRights, setOwnsRights] = useState(false)
  const [notReleasedPublicly, setNotReleasedPublicly] = useState(false)
  const [agreesTerms, setAgreesTerms] = useState(false)

  // TESTING MODE: All validation disabled - allows submitting without any data
  const isFormValid = true

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from("audio").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)

    try {
      // Upload song sample if provided
      let songSampleUrl = "https://placeholder-sample.wav"
      if (songSampleFile) {
        songSampleUrl = await uploadFile(songSampleFile, "applications")
      }

      // Upload hook preview if provided
      let hookPreviewUrl = null
      if (hookPreviewFile) {
        hookPreviewUrl = await uploadFile(hookPreviewFile, "applications")
      }

      // Insert application with defaults for missing fields (TESTING MODE)
      const { error } = await supabase.from("artist_applications").insert({
        artist_name: artistName || "Test Artist",
        contact_email: contactEmail || "test@example.com",
        country_city: countryCity || null,
        spotify_url: spotifyUrl || null,
        apple_music_url: appleMusicUrl || null,
        years_releasing: yearsReleasing || "1-2 years",
        genres: genres || "Test Genre",
        primary_social_platform: primarySocialPlatform || "instagram",
        social_profile_url: socialProfileUrl || "https://instagram.com/test",
        follower_count: parseInt(followerCount) || 1000,
        song_sample_url: songSampleUrl,
        hook_preview_url: hookPreviewUrl,
        owns_rights: true,
        not_released_publicly: true,
        agrees_terms: true,
        status: "pending",
      })

      if (error) throw error

      navigate("/artist/application-status", {
        state: { artistName, contactEmail },
      })
    } catch (error) {
      console.error("Application error:", error)
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
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
                  <Label htmlFor="artistName" className="text-sm">Artist Name *</Label>
                  <Input
                    id="artistName"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Your artist/stage name"
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="artist@email.com"
                    className="h-12 text-base"
                    required
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
                  <Label htmlFor="spotifyUrl" className="text-sm">Spotify Artist Profile URL</Label>
                  <Input
                    id="spotifyUrl"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/artist/..."
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appleMusicUrl" className="text-sm">Apple Music Artist Profile URL</Label>
                  <Input
                    id="appleMusicUrl"
                    value={appleMusicUrl}
                    onChange={(e) => setAppleMusicUrl(e.target.value)}
                    placeholder="https://music.apple.com/artist/..."
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Years Releasing Music *</Label>
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
                  <Label htmlFor="genres" className="text-sm">Genre(s) *</Label>
                  <Input
                    id="genres"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    placeholder="Hip-Hop, R&B, Pop..."
                    className="h-12 text-base"
                    required
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
                  <Label className="text-sm">Primary Social Platform *</Label>
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
                  <Label htmlFor="socialProfileUrl" className="text-sm">Social Profile URL *</Label>
                  <Input
                    id="socialProfileUrl"
                    value={socialProfileUrl}
                    onChange={(e) => setSocialProfileUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followerCount" className="text-sm">Approximate Follower Count *</Label>
                  <Input
                    id="followerCount"
                    type="number"
                    min="0"
                    value={followerCount}
                    onChange={(e) => setFollowerCount(e.target.value)}
                    placeholder="10000"
                    className="h-12 text-base"
                    required
                  />
                </div>
              </div>
            </GlowCard>

            {/* Section 4: Music Quality */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 text-center">
                Music Quality
              </h3>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm">Upload Song Sample (.WAV only) *</Label>
                  <div className="mt-2">
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                      <div className="flex flex-col items-center justify-center py-4">
                        {songSampleFile ? (
                          <>
                            <CheckCircle className="w-8 h-8 text-primary mb-2" />
                            <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                              {songSampleFile.name}
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload .WAV</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".wav"
                        onChange={(e) => setSongSampleFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Upload 15s Hook Preview (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">.WAV or .MP3</p>
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                      <div className="flex flex-col items-center justify-center py-3">
                        {hookPreviewFile ? (
                          <>
                            <CheckCircle className="w-7 h-7 text-primary mb-2" />
                            <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                              {hookPreviewFile.name}
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-7 h-7 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".wav,.mp3"
                        onChange={(e) => setHookPreviewFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Section 5: Rights Confirmation */}
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
                    I confirm I own or control all rights to the music I submit *
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
                    I confirm this music has not been released publicly yet OR I have the right to release it early *
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
                    I agree to the Artist Terms of Service *
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
