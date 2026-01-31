import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Unlock, ChevronLeft, Home, Loader2, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email" }),
  vaultCode: z
    .string()
    .trim()
    .length(4, { message: "Code must be exactly 4 digits" })
    .regex(/^\d{4}$/, { message: "Code must be 4 digits (0-9)" }),
});

type FormValues = z.infer<typeof formSchema>;

interface LocationState {
  email?: string;
  name?: string;
  vaultCode?: string;
}

const SubmitVaultCode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as LocationState | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      vaultCode: "",
    },
  });

  // Auto-fill email from URL params, navigation state, or session storage
  useEffect(() => {
    // Priority: URL params > navigation state > session storage
    const emailFromUrl = searchParams.get("email");
    const codeFromUrl = searchParams.get("code");
    const emailFromState = state?.email;
    const codeFromState = state?.vaultCode;
    const emailFromSession = sessionStorage.getItem("vaultEmail");
    const codeFromSession = sessionStorage.getItem("vaultCode");
    
    const email = emailFromUrl || emailFromState || emailFromSession;
    const code = codeFromUrl || codeFromState || codeFromSession;
    
    if (email) {
      form.setValue("email", email, { shouldValidate: true, shouldDirty: true });
    }
    if (code) {
      form.setValue("vaultCode", code, { shouldValidate: true, shouldDirty: true });
    }
  }, [searchParams, state, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setShowError(false);
    setIsBlocked(false);
    
    try {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      // First check if this email is rate-limited
      const { data: emailRecord } = await supabase
        .from("vault_codes")
        .select("id, attempts_count, last_attempt_at")
        .eq("email", values.email)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (emailRecord) {
        const lastAttempt = emailRecord.last_attempt_at 
          ? new Date(emailRecord.last_attempt_at) 
          : null;
        
        // Check if blocked (5+ attempts within 10 minutes)
        if (lastAttempt && lastAttempt > tenMinutesAgo && emailRecord.attempts_count >= 5) {
          setIsBlocked(true);
          return;
        }
      }
      
      // Find matching vault code record - check for valid codes (not expired OR codes with 'lost' status for re-entry)
      const { data: vaultRecord, error: fetchError } = await supabase
        .from("vault_codes")
        .select("*")
        .eq("email", values.email)
        .eq("code", values.vaultCode)
        .maybeSingle();
      
      if (fetchError) {
        console.error("Error fetching vault code:", fetchError);
        toast.error("Something went wrong. Please try again.");
        return;
      }
      
      // Check if code exists and is valid (not used, or is a re-entry with 'lost' status)
      const isValidForReentry = vaultRecord && 
        (vaultRecord.status === "lost" || vaultRecord.status === "pending") &&
        !vaultRecord.used_at;
      
      const isValidFreshCode = vaultRecord && 
        !vaultRecord.used_at && 
        new Date(vaultRecord.expires_at) > now;
      
      if (!vaultRecord || (!isValidForReentry && !isValidFreshCode)) {
        // Invalid or expired code - increment attempts
        if (emailRecord) {
          const lastAttempt = emailRecord.last_attempt_at 
            ? new Date(emailRecord.last_attempt_at) 
            : null;
          
          // Reset count if last attempt was more than 10 minutes ago
          const newAttemptsCount = lastAttempt && lastAttempt > tenMinutesAgo 
            ? emailRecord.attempts_count + 1 
            : 1;
          
          await supabase
            .from("vault_codes")
            .update({ 
              attempts_count: newAttemptsCount,
              last_attempt_at: now.toISOString()
            })
            .eq("id", emailRecord.id);
          
          // Check if now blocked
          if (newAttemptsCount >= 5) {
            setIsBlocked(true);
            return;
          }
        }
        
        setShowError(true);
        return;
      }
      
      // Determine outcome - For testing, use random. In production, this would be a draw system.
      // Re-entry users with 'lost' status get another chance
      const isWinner = Math.random() > 0.5; // 50% chance for testing
      
      if (isWinner) {
        // Valid code - mark as used and update status to 'won'
        const { error: updateError } = await supabase
          .from("vault_codes")
          .update({ 
            used_at: now.toISOString(),
            attempts_count: 0,
            last_attempt_at: null,
            status: "won"
          })
          .eq("id", vaultRecord.id);
        
        if (updateError) {
          console.error("Error updating vault code:", updateError);
          toast.error("Something went wrong. Please try again.");
          return;
        }
        
        // Send vault win email with the code
        try {
          const { error: emailError } = await supabase.functions.invoke("send-vault-win-email", {
            body: {
              email: values.email,
              name: vaultRecord.name,
              vaultCode: values.vaultCode,
            },
          });
          
          if (emailError) {
            console.error("Failed to send vault win email:", emailError);
          }
        } catch (emailErr) {
          console.error("Error sending vault win email:", emailErr);
        }
        
        toast.success("Code verified! Welcome to the vault.");
        
        // Navigate to vault status as winner
        navigate("/vault/status", { 
          state: { 
            email: values.email, 
            name: vaultRecord.name,
            vaultCode: values.vaultCode,
            vaultState: "winner"
          } 
        });
      } else {
        // Not selected - keep the code valid for next draw
        await supabase
          .from("vault_codes")
          .update({ 
            attempts_count: 0,
            last_attempt_at: null,
            status: "lost",
            next_draw_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq("id", vaultRecord.id);
        
        // Navigate to vault status as not selected
        navigate("/vault/status", { 
          state: { 
            email: values.email, 
            name: vaultRecord.name,
            vaultCode: values.vaultCode,
            vaultState: "not_selected"
          } 
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-12">
      {/* Navigation Header */}
      <header className="w-full max-w-md mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/vault/enter")}
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

      {/* Background glow effect */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0, 212, 255, 0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <GlowCard glowColor="gradient" hover={false} className="group">
            <div className="p-8 md:p-10 flex flex-col items-center">
              <div className="flex justify-center mb-8">
                <SectionHeader
                  title="SUBMIT YOUR VAULT CODE"
                  align="center"
                  framed
                />
              </div>

              {isBlocked ? (
                /* Blocked State */
                <div className="text-center space-y-6 w-full">
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-destructive/10 p-4">
                      <Clock className="h-10 w-10 text-destructive" />
                    </div>
                  </div>
                  <p className="text-foreground font-display text-lg">
                    Too many attempts
                  </p>
                  <p className="text-muted-foreground font-body text-sm">
                    Please try again in 10 minutes.
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => navigate("/")}
                  >
                    RETURN HOME
                  </Button>
                </div>
              ) : showError ? (
                /* Error State */
                <div className="text-center space-y-6 w-full">
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                    <p className="text-foreground font-display text-lg mb-2">
                      Invalid or expired code
                    </p>
                    <p className="text-muted-foreground font-body text-sm">
                      Please request a new Vault Code.
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => navigate("/vault/enter")}
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    REQUEST NEW CODE
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => setShowError(false)}
                  >
                    TRY AGAIN
                  </Button>
                </div>
              ) : (
                /* Form State */
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="w-full space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider">
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              {...field}
                              className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base"
                              autoComplete="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vaultCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider">
                            4-Digit Vault Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0000"
                              {...field}
                              className="h-14 text-center text-2xl tracking-[0.5em] font-display bg-muted/30 border-border/50 focus:border-primary/50 text-foreground rounded-xl"
                              autoComplete="off"
                              maxLength={4}
                              inputMode="numeric"
                              pattern="[0-9]*"
                            />
                          </FormControl>
                          <FormMessage className="text-center" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          VALIDATING...
                        </>
                      ) : (
                        <>
                          <Unlock className="mr-2 h-5 w-5" />
                          UNLOCK ACCESS
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {!showError && !isBlocked && (
                <p className="mt-6 text-muted-foreground text-sm text-center font-body">
                  Codes expire 30 minutes after issue.
                </p>
              )}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};

export default SubmitVaultCode;
