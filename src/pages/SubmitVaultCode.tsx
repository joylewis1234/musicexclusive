import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Unlock } from "lucide-react";

const formSchema = z.object({
  vaultCode: z
    .string()
    .trim()
    .length(6, { message: "Vault code must be 6 digits" })
    .regex(/^\d{6}$/, { message: "Vault code must contain only digits" }),
});

type FormValues = z.infer<typeof formSchema>;

const SubmitVaultCode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vaultCode: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Check if the vault code exists
      const { data, error } = await supabase
        .from("vault_codes")
        .select("id, email, name")
        .eq("vault_code", values.vaultCode)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setErrorMessage("Invalid Vault Code. Please check and try again.");
        setIsLoading(false);
        return;
      }

      // Valid code - navigate to vault status
      toast({
        title: "Access Granted",
        description: "You've been added to the draw pool.",
      });

      navigate("/vault-status", { state: { email: data.email, name: data.name } });
    } catch (error) {
      console.error("Error validating vault code:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <GlowCard className="group">
          <div className="p-6 md:p-8 flex flex-col items-center">
            <SectionHeader
              title="Submit Your Vault Code"
              align="center"
              framed
              className="mb-8"
            />

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full space-y-6"
              >
                <FormField
                  control={form.control}
                  name="vaultCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Enter 6-digit code"
                          {...field}
                          className="h-14 text-center text-xl tracking-[0.3em] font-display uppercase bg-muted/30 border-border focus:border-primary/50 placeholder:tracking-normal placeholder:text-sm"
                          maxLength={6}
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />

                {/* Error message with glow styling */}
                {errorMessage && (
                  <div className="relative">
                    <div
                      className="absolute -inset-1 rounded-lg bg-destructive/20 blur-md"
                      aria-hidden="true"
                    />
                    <p className="relative text-center text-sm text-destructive bg-destructive/10 rounded-lg py-3 px-4 border border-destructive/30">
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
                  <Unlock className="mr-2 h-5 w-5" />
                  {isLoading ? "Validating..." : "Unlock Access"}
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-muted-foreground text-sm text-center font-body">
              Each code keeps you eligible for future draws.
            </p>
          </div>
        </GlowCard>
      </div>
    </div>
  );
};

export default SubmitVaultCode;
