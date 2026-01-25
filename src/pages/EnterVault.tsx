import * as React from "react";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
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
import { useToast } from "@/hooks/use-toast";

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
});

type FormValues = z.infer<typeof formSchema>;

const EnterVault = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("vault_codes").insert({
        name: values.name,
        email: values.email,
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          toast({
            title: "Already registered",
            description: "This email is already in the Vault.",
            variant: "default",
          });
          setIsSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setIsSubmitted(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow effect */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0, 212, 255, 0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <GlowCard glowColor="gradient" hover={false} className="group">
          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="flex justify-center mb-8">
              <SectionHeader title="ENTER THE VAULT" framed align="center" />
            </div>

            {isSubmitted ? (
              /* Confirmation State */
              <div className="text-center space-y-6">
                <div
                  className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 flex items-center justify-center"
                  style={{
                    boxShadow:
                      "0 0 30px rgba(0, 212, 255, 0.4), 0 0 60px rgba(139, 92, 246, 0.3)",
                  }}
                >
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p
                  className="text-lg font-display uppercase tracking-wider text-foreground"
                  style={{
                    textShadow:
                      "0 0 20px rgba(255, 255, 255, 0.4)",
                  }}
                >
                  Your Vault code has been sent.
                </p>
                <p className="text-sm text-muted-foreground">
                  Check your inbox for your exclusive access code.
                </p>
              </div>
            ) : (
              /* Form State */
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "GET MY VAULT CODE"}
                  </Button>
                </form>
              </Form>
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
  );
};

export default EnterVault;
