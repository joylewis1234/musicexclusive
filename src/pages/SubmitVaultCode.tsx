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
    .length(4, { message: "Code must be exactly 4 characters" })
    .regex(/^[A-Z0-9]{4}$/i, { message: "Code must be 4 alphanumeric characters" })
    .transform((val) => val.toUpperCase()),
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

  // Get initial values from state/session/URL before form initialization
  const emailFromUrl = searchParams.get("email");
  const codeFromUrl = searchParams.get("code");
  const emailFromState = state?.email;
  const codeFromState = state?.vaultCode;
  const emailFromSession = sessionStorage.getItem("vaultEmail");
  const codeFromSession = sessionStorage.getItem("vaultCode");
  
  const initialEmail = emailFromUrl || emailFromState || emailFromSession || "";
  const initialCode = codeFromUrl || codeFromState || codeFromSession || "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: initialEmail,
      vaultCode: initialCode,
    },
  });

  // Check for force query param (test mode)
  const forceParam = searchParams.get("force") as "win" | "lose" | null;

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setShowError(false);
    setIsBlocked(false);
    
    try {
      // Call server-side rate-limited validation
      const requestBody: Record<string, string> = {
        email: values.email,
        vaultCode: values.vaultCode,
        mode: "submit",
      };
      
      // Pass force param for test mode
      if (forceParam === "win" || forceParam === "lose") {
        requestBody.forceResult = forceParam;
      }

      const { data, error } = await supabase.functions.invoke("validate-vault-code", {
        body: requestBody,
      });

      if (error) {
        console.error("Error validating vault code:", error);
        toast.error(error.message || "Something went wrong. Please try again.");
        return;
      }

      // Handle rate limiting
      if (data.error === "rate_limited") {
        setIsBlocked(true);
        return;
      }

      // Handle invalid code
      if (data.error === "invalid_code") {
        setShowError(true);
        if (data.attemptsRemaining !== undefined && data.attemptsRemaining <= 2) {
          toast.warning(`${data.attemptsRemaining} attempts remaining`);
        }
        return;
      }

      // Handle expired code
      if (data.error === "expired_code") {
        setShowError(true);
        return;
      }

      // Handle other errors
      if (data.error) {
        toast.error(data.message || "Something went wrong. Please try again.");
        return;
      }

      // Success - navigate based on result
      if (data.result === "winner") {
        toast.success("Code verified! Welcome to the vault.");
        navigate("/vault/status", { 
          state: { 
            email: values.email, 
            name: data.name,
            vaultCode: values.vaultCode,
            vaultState: "winner"
          } 
        });
      } else {
        // Not selected
        navigate("/vault/status", { 
          state: { 
            email: values.email, 
            name: data.name,
            vaultCode: values.vaultCode,
            vaultState: "not_selected"
          } 
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
                            4-Character Vault Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ABCD"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              className="h-14 text-center text-2xl tracking-[0.5em] font-display bg-muted/30 border-border/50 focus:border-primary/50 text-foreground rounded-xl uppercase"
                              autoComplete="off"
                              maxLength={4}
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
                  Your Vault Code is permanent — use it anytime.
                </p>
              )}

              {/* Test Mode Indicator */}
              {forceParam && (
                <div className="mt-4 border border-dashed border-yellow-500/50 rounded-lg p-3 bg-yellow-500/5">
                  <p className="text-xs text-yellow-500 uppercase tracking-wider text-center font-medium">
                    🧪 Test Mode: force={forceParam}
                  </p>
                </div>
              )}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};

export default SubmitVaultCode;
