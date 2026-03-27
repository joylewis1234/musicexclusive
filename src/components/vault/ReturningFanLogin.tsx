import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlowCard } from "@/components/ui/GlowCard";
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
import { KeyRound, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAppBaseUrl } from "@/config/app";

const returnFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email" })
    .max(255, { message: "Email must be less than 255 characters" }),
  vaultCode: z
    .string()
    .trim()
    .length(4, { message: "Vault code must be exactly 4 characters" })
    .regex(/^[A-Z0-9]{4}$/i, { message: "Vault code must be 4 alphanumeric characters" })
    .transform((val) => val.toUpperCase()),
});

type ReturnFormValues = z.infer<typeof returnFormSchema>;

export const ReturningFanLogin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      email: "",
      vaultCode: "",
    },
  });

  const onSubmit = async (values: ReturnFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Call server-side rate-limited validation in lookup mode
      const { data, error } = await supabase.functions.invoke("validate-vault-code", {
        body: {
          email: values.email,
          vaultCode: values.vaultCode,
          mode: "lookup",
        },
      });

      if (error) {
        console.error("Error validating vault code:", error);
        setErrorMessage("Something went wrong. Please try again.");
        return;
      }

      // Handle rate limiting
      if (data.error === "rate_limited") {
        const minutes = Math.ceil((data.retryAfterSeconds || 600) / 60);
        setErrorMessage(`Too many attempts. Please try again in ${minutes} minutes.`);
        return;
      }

      // Handle invalid code
      if (data.error === "invalid_code") {
        setErrorMessage(data.message || "We couldn't find that Vault Code. Double-check your email and try again.");
        return;
      }

      // Handle other errors
      if (data.error) {
        setErrorMessage(data.message || "Something went wrong. Please try again.");
        return;
      }

      // Store in session for continuity
      sessionStorage.setItem("vaultCode", values.vaultCode.toUpperCase());
      sessionStorage.setItem("vaultEmail", values.email);
      sessionStorage.setItem("vaultName", data.name);

      // Route based on status
      if (data.status === "won") {
        const params = new URLSearchParams({
          email: values.email,
          code: values.vaultCode,
        });
        navigate(`/vault/congrats?${params.toString()}`);
      } else {
        // Lost or pending - show vault status
        navigate("/vault/status", {
          state: {
            email: values.email,
            name: data.name,
            vaultCode: values.vaultCode,
            vaultState: "not_selected",
            fromReturn: true,
            nextDrawDate: data.nextDrawDate,
          },
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const email = form.getValues("email");
    
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error("Please enter a valid email first");
      return;
    }

    setIsResending(true);
    setErrorMessage(null);

    try {
      // Look up the latest code for this email
      const { data: existingCode, error } = await supabase
        .from("vault_codes")
        .select("*")
        .eq("email", email.toLowerCase())
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error looking up vault code:", error);
        toast.error("Something went wrong. Please try again.");
        return;
      }

      if (!existingCode) {
        toast.error("No Vault Code found for this email yet. Enter the Vault to get your code.");
        return;
      }

      // Send the resend email (use current origin so links match the session domain)
      const base = getAppBaseUrl();
      const returnUrl = `${base}/vault/submit?email=${encodeURIComponent(email)}&code=${existingCode.code}`;

      const { error: emailError } = await supabase.functions.invoke("send-vault-resend-email", {
        body: {
          email: email,
          name: existingCode.name,
          vaultCode: existingCode.code,
          appUrl: base,
          returnUrl: returnUrl,
        },
      });

      if (emailError) {
        console.error("Error sending resend email:", emailError);
        toast.error("Failed to resend code. Please try again.");
        return;
      }

      toast.success("Check your email! We sent your Vault Code.");
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <GlowCard glowColor="secondary" hover={false} className="group">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-center mb-6">
            <SectionHeader 
              title="RETURN TO THE VAULT" 
              framed 
              align="center" 
            />
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-primary/20 flex items-center justify-center border border-purple-500/30">
                <KeyRound className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-center text-sm text-muted-foreground mb-6">
            Already have a Vault Code? Enter it below to check your status.
          </p>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Your email"
                        className="h-12 bg-muted/30 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base"
                        {...field}
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
                    <FormControl>
                      <Input
                        type="text"
                        maxLength={4}
                        placeholder="4-Character Vault Code"
                        className="h-12 bg-muted/30 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base text-center tracking-[0.3em] font-display uppercase"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive text-center">{errorMessage}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    CHECKING...
                  </>
                ) : (
                  <>
                    CONTINUE
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Resend Button */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isResending}
                onClick={handleResendCode}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    SENDING...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    RESEND MY CODE
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </GlowCard>
    </div>
  );
};
