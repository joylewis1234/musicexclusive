import * as React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlowCard } from "@/components/ui/GlowCard";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ChevronLeft, ArrowRight, Home, Copy, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FanCommentBubble } from "@/components/vault/FanCommentBubble";
import { ReturningFanLogin } from "@/components/vault/ReturningFanLogin";
import vaultPortal from "@/assets/vault-portal.png";

// Fan testimonials for floating comments around the vault
const fanComments = [
  { name: "Elizabeth Grace", comment: "This is amazing!", position: "top-center" as const, delay: 0 },
  { name: "Olivia Williams", comment: "Can't stop listening.", position: "left" as const, delay: 200 },
  { name: "Emma Johnson", comment: "Total vibes.", position: "right" as const, delay: 400 },
  { name: "Isabella Davis", comment: "Pure fire 🔥", position: "bottom-left" as const, delay: 600 },
  { name: "Sophia Brown", comment: "Love every second.", position: "bottom-right" as const, delay: 800 },
];

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72, { message: "Password must be less than 72 characters" }),
  confirmPassword: z
    .string()
    .min(1, { message: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

// Generate 4-digit numeric code with leading zeros
const generateVaultCode = (): string => {
  const num = Math.floor(Math.random() * 10000);
  return num.toString().padStart(4, "0");
};

const EnterVault = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [hasExistingCode, setHasExistingCode] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ name: string; email: string } | null>(null);
  const [vaultCode, setVaultCode] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Check if email already has a valid code
  const checkExistingCode = async (email: string) => {
    if (!email || !z.string().email().safeParse(email).success) return;
    
    setIsCheckingExisting(true);
    try {
      const { data: existingCode } = await supabase
        .from("vault_codes")
        .select("code, name, expires_at, used_at")
        .eq("email", email)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      
      if (existingCode) {
        setHasExistingCode(true);
        setVaultCode(existingCode.code);
        setSubmittedData({ name: existingCode.name, email });
        setIsSubmitted(true);
        sessionStorage.setItem("vaultCode", existingCode.code);
        sessionStorage.setItem("vaultEmail", email);
        sessionStorage.setItem("vaultName", existingCode.name);
        // Scroll to top to show the vault code
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setHasExistingCode(false);
      }
    } catch (err) {
      console.error("Error checking existing code:", err);
    } finally {
      setIsCheckingExisting(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Check if email already has an unexpired, unused code
      const { data: existingCode } = await supabase
        .from("vault_codes")
        .select("code, expires_at, used_at, issued_at")
        .eq("email", values.email)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      
      if (existingCode) {
        // User already has an active vault code - prompt them to log in instead
        toast.info("You already have a vault code! Please log in below to continue.");
        setIsSubmitting(false);
        return;
      }
      
      // Rate limiting: Check if a code was issued recently (within 1 minute)
      const { data: recentCodes } = await supabase
        .from("vault_codes")
        .select("issued_at")
        .eq("email", values.email)
        .gte("issued_at", new Date(Date.now() - 60 * 1000).toISOString())
        .order("issued_at", { ascending: false })
        .limit(1);
      
      if (recentCodes && recentCodes.length > 0) {
        const lastIssued = new Date(recentCodes[0].issued_at);
        const secondsSince = Math.floor((Date.now() - lastIssued.getTime()) / 1000);
        const waitTime = 60 - secondsSince;
        
        toast.error(`Please wait ${waitTime} seconds before requesting another code`);
        setIsSubmitting(false);
        return;
      }
      
      // Create user account first
      const { error: signUpError } = await signUp(values.email, values.password, "fan", values.name);
      
      if (signUpError) {
        // Check for specific error types
        if (signUpError.message.includes("already registered")) {
          toast.error("This email is already registered. Please log in below.");
        } else {
          toast.error(signUpError.message || "Failed to create account. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }
      
      // Generate unique 4-digit code
      let generatedCode = generateVaultCode();
      let attempts = 0;
      const maxAttempts = 20;
      
      // Retry if code already exists (collision handling)
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from("vault_codes")
          .select("code")
          .eq("code", generatedCode)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        
        if (!existing) break;
        generatedCode = generateVaultCode();
        attempts++;
      }
      
      // Only delete expired or used codes for this email (not valid ones)
      const now = new Date().toISOString();
      await supabase
        .from("vault_codes")
        .delete()
        .eq("email", values.email)
        .or(`used_at.not.is.null,expires_at.lt.${now}`);
      
      // Insert new vault code with expiration
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      
      const { error } = await supabase
        .from("vault_codes")
        .insert({
          name: values.name,
          email: values.email,
          code: generatedCode,
          expires_at: expiresAt,
        });
      
      if (error) {
        console.error("Error inserting vault code:", error);
        toast.error("Something went wrong. Please try again.");
        return;
      }
      
      setVaultCode(generatedCode);
      setSubmittedData({ name: values.name, email: values.email });
      setIsSubmitted(true);
      
      // Scroll to top to show the vault code
      window.scrollTo({ top: 0, behavior: "smooth" });
      
      // Store in sessionStorage for persistence across navigation
      sessionStorage.setItem("vaultCode", generatedCode);
      sessionStorage.setItem("vaultEmail", values.email);
      sessionStorage.setItem("vaultName", values.name);
      
      toast.success("Account created! Your vault code is ready.");
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(vaultCode);
      setIsCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-12">
      {/* Navigation Header */}
      <header className="w-full max-w-md mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Home</span>
        </button>
      </header>

      {/* ========================================
          VAULT PORTAL SECTION WITH FAN COMMENTS
          Large portal with floating testimonials
          ======================================== */}
      <section className="relative w-full max-w-lg md:max-w-2xl mx-auto mb-8">
        {/* Animated glow orbs behind the vault */}
        <div className="absolute inset-0 bg-secondary/30 blur-[100px] rounded-full scale-90 animate-pulse" />
        <div className="absolute inset-0 bg-accent/25 blur-[80px] rounded-full scale-100 animate-pulse [animation-delay:1s]" />
        <div className="absolute inset-0 bg-primary/25 blur-[90px] rounded-full scale-95 animate-pulse [animation-delay:0.5s]" />
        
        {/* Vault Portal Container */}
        <div className="relative mx-auto w-full max-w-sm md:max-w-md aspect-square">
          {/* Static vault portal image with breathing glow */}
          <img
            src={vaultPortal}
            alt="Vault Portal"
            className="relative w-full h-full object-contain vault-glow z-10"
          />
          
          {/* Inner energy lightning effect - overlaid on top with blend mode */}
          <div className="absolute inset-[20%] rounded-full overflow-hidden pointer-events-none mix-blend-screen z-20">
            <div className="absolute inset-0 animate-vault-lightning-1 opacity-70" />
            <div className="absolute inset-0 animate-vault-lightning-2 opacity-60" />
            <div className="absolute inset-0 animate-vault-lightning-3 opacity-50" />
          </div>
          
          {/* ========================================
              FLOATING FAN COMMENTS
              Positioned around the vault portal
              ======================================== */}
          {fanComments.map((fan) => (
            <FanCommentBubble
              key={fan.name}
              name={fan.name}
              comment={fan.comment}
              position={fan.position}
              delay={fan.delay}
              rating={5}
            />
          ))}
        </div>
      </section>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-md">
          <GlowCard glowColor="gradient" hover={false} className="group">
            <div className="p-8 md:p-10">
              {/* Header */}
              <div className="flex justify-center mb-8">
                <SectionHeader 
                  title={isSubmitted ? "YOUR VAULT CODE" : "ENTER THE VAULT"} 
                  framed 
                  align="center" 
                />
              </div>

              {isSubmitted ? (
                /* Success State with Vault Code */
                <div className="text-center space-y-6">
                  {/* Vault Code Display with Neon Frame */}
                  <div className="relative">
                    {/* Outer glow */}
                    <div 
                      className="absolute -inset-[3px] rounded-xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-50 blur-lg"
                      aria-hidden="true"
                    />
                    {/* Gradient border */}
                    <div 
                      className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-primary via-purple-500 to-pink-500"
                      aria-hidden="true"
                    />
                    {/* Code container */}
                    <div className="relative rounded-xl bg-background p-6">
                      <p 
                        className="text-3xl md:text-4xl font-display font-bold tracking-[0.3em] text-foreground select-all"
                        style={{
                          textShadow: "0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)",
                        }}
                      >
                        {vaultCode}
                      </p>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={handleCopyCode}
                  >
                    {isCopied ? (
                      <>
                        <Check className="mr-2 h-5 w-5 text-green-500" />
                        COPIED!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-5 w-5" />
                        COPY CODE
                      </>
                    )}
                  </Button>

                  {/* Submit Code Button */}
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => navigate("/vault/submit", { 
                      state: { 
                        email: submittedData?.email, 
                        name: submittedData?.name,
                        vaultCode: vaultCode
                      } 
                    })}
                  >
                    SUBMIT CODE
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>

                  {/* Helper text */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-body">
                      Your code expires in 30 minutes.
                    </p>
                    {hasExistingCode && (
                      <p className="text-sm text-primary font-body font-medium">
                        You already have a code — use this one to maximize your chances!
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Form State */
                <div className="space-y-8">
                  {/* Explanatory Section */}
                  <div className="text-center space-y-4">
                    <h3 
                      className="text-lg md:text-xl font-display uppercase tracking-widest text-foreground"
                      style={{
                        textShadow: '0 0 15px rgba(0, 212, 255, 0.4), 0 0 30px rgba(0, 212, 255, 0.2)'
                      }}
                    >
                      How the Vault Works
                    </h3>
                    <div className="space-y-3 text-sm md:text-base text-muted-foreground font-body leading-relaxed">
                      <p>
                        Enter your email to generate a Vault Code.
                        Your code gives you a chance to unlock access to Music Exclusive — a private space where fans hear music before it hits the world.
                      </p>
                      <p>
                        If your code is selected, the Vault opens and you're in.
                        If not, no worries — your code stays active and you're automatically entered into the next draw.
                      </p>
                      <p className="text-primary/90 font-medium">
                        ⚠️ You only need ONE code. Requesting multiple codes will NOT increase your chances — it may actually decrease them.
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                  {/* Form */}
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Your name"
                                className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Your email"
                                className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  checkExistingCode(e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create password"
                                  className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base pr-12"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm password"
                                  className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base pr-12"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Terms Checkbox */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                          I agree to the Music Exclusive{" "}
                          <Link 
                            to="/terms" 
                            target="_blank"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Terms of Use
                          </Link>.
                        </span>
                      </label>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting || isCheckingExisting || !termsAccepted}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            CREATING...
                          </>
                        ) : isCheckingExisting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            CHECKING...
                          </>
                        ) : (
                          "GET MY VAULT CODE"
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              )}

              {/* Helper text */}
              {!isSubmitted && (
                <p className="mt-6 text-center text-sm text-muted-foreground font-body">
                  Access is limited. Winners enter. Everyone else stays eligible.
                </p>
              )}
            </div>
          </GlowCard>
        </div>
      </div>

      {/* ========================================
          RETURNING FAN LOGIN SECTION
          For fans who already have a vault code
          ======================================== */}
      <section className="mt-12 mb-8">
        <div className="w-full max-w-md mx-auto mb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-display">
              Already have a code?
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
          </div>
        </div>
        <ReturningFanLogin />
      </section>
    </div>
  );
};

export default EnterVault;
