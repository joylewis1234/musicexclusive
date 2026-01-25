import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Unlock, ChevronLeft, Home, Loader2, RefreshCw } from "lucide-react";
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

  // Auto-fill email from navigation state or session storage
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
    setShowError(false);
    
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
        // Invalid or expired code
        setShowError(true);
        return;
      }
      
      // Valid code - mark as used
      const { error: updateError } = await supabase
        .from("vault_codes")
        .update({ used_at: new Date().toISOString() })
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

              {showError ? (
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

              {!showError && (
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
