import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
import { Unlock, ChevronLeft, Home, Loader2, AlertTriangle } from "lucide-react";
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
  const [isBlocked, setIsBlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      vaultCode: "",
    },
  });

  // Auto-fill from navigation state or session storage
  useEffect(() => {
    const emailFromState = state?.email;
    const emailFromSession = sessionStorage.getItem("vaultEmail");
    const email = emailFromState || emailFromSession;
    
    const codeFromState = state?.vaultCode;
    const codeFromSession = sessionStorage.getItem("vaultCode");
    const code = codeFromState || codeFromSession;
    
    if (email) {
      form.setValue("email", email);
    }
    if (code) {
      form.setValue("vaultCode", code);
    }
  }, [state?.email, state?.vaultCode, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Find matching vault code record
      const { data: vaultRecord, error: fetchError } = await supabase
        .from("vault_codes")
        .select("*")
        .eq("email", values.email)
        .eq("code", values.vaultCode)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      
      if (fetchError) {
        console.error("Error fetching vault code:", fetchError);
        toast.error("Something went wrong. Please try again.");
        return;
      }
      
      if (!vaultRecord) {
        // Invalid code - need to increment attempts
        // First, find any record with this email to track attempts
        const { data: emailRecord } = await supabase
          .from("vault_codes")
          .select("id, attempts_count, last_attempt_at")
          .eq("email", values.email)
          .order("issued_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (emailRecord) {
          const now = new Date();
          const lastAttempt = emailRecord.last_attempt_at 
            ? new Date(emailRecord.last_attempt_at) 
            : null;
          
          // Check if blocked (5+ attempts within 10 minutes)
          const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
          const recentAttempts = lastAttempt && lastAttempt > tenMinutesAgo 
            ? emailRecord.attempts_count 
            : 0;
          
          if (recentAttempts >= 5) {
            setIsBlocked(true);
            setErrorMessage("Too many attempts. Please try again later.");
            return;
          }
          
          // Increment attempts
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
          
          if (newAttemptsCount >= 5) {
            setIsBlocked(true);
            setErrorMessage("Too many attempts. Please try again later.");
            return;
          }
        }
        
        setErrorMessage("Invalid code or email. Please check and try again.");
        return;
      }
      
      // Valid code - mark as used
      const { error: updateError } = await supabase
        .from("vault_codes")
        .update({ 
          used_at: new Date().toISOString(),
          attempts_count: 0 // Reset attempts on successful use
        })
        .eq("id", vaultRecord.id);
      
      if (updateError) {
        console.error("Error updating vault code:", updateError);
        toast.error("Something went wrong. Please try again.");
        return;
      }
      
      toast.success("Code verified! Welcome to the vault.");
      
      // Navigate to vault status
      navigate("/vault/status", { 
        state: { 
          email: values.email, 
          name: vaultRecord.name,
          vaultState: "in_draw"
        } 
      });
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

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <GlowCard className="group">
            <div className="p-6 md:p-8 flex flex-col items-center">
              <SectionHeader
                title="Submit Your Vault Code"
                align="center"
                framed
                className="mb-8"
              />

              {isBlocked ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-destructive/10 p-4">
                      <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                  </div>
                  <p className="text-lg font-display text-foreground">
                    Too many attempts
                  </p>
                  <p className="text-muted-foreground font-body">
                    Please try again later.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="mt-4"
                  >
                    Return Home
                  </Button>
                </div>
              ) : (
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
                          <FormLabel className="text-muted-foreground">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              {...field}
                              className="h-14 bg-muted/30 border-border focus:border-primary/50"
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
                          <FormLabel className="text-muted-foreground">4-Digit Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0000"
                              {...field}
                              className="h-14 text-center text-2xl tracking-[0.5em] font-display bg-muted/30 border-border focus:border-primary/50"
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

                    {errorMessage && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive text-center font-body">
                          {errorMessage}
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <Unlock className="mr-2 h-5 w-5" />
                          Unlock Access
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {!isBlocked && (
                <>
                  <p className="mt-6 text-muted-foreground text-sm text-center font-body">
                    Codes expire 30 minutes after issue.
                  </p>

                  <Link 
                    to="/vault/enter" 
                    className="mt-4 text-primary/80 hover:text-primary text-sm text-center font-body underline underline-offset-4 transition-colors"
                  >
                    Need a new code? Go back to get one.
                  </Link>
                </>
              )}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};

export default SubmitVaultCode;
