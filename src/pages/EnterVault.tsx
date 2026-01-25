import * as React from "react";
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
import { ChevronLeft, ArrowRight } from "lucide-react";

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
  const [submittedData, setSubmittedData] = useState<FormValues | null>(null);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // Temporary client-side only submission
  const onSubmit = (values: FormValues) => {
    // Store the submitted data for navigation state
    setSubmittedData(values);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-12">
      {/* Back Link */}
      <header className="w-full max-w-md mx-auto mb-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
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
                
                {/* Navigate to submit code */}
                <Button
                  size="lg"
                  className="w-full mt-4"
                  onClick={() => navigate("/vault/submit", { 
                    state: { 
                      email: submittedData?.email, 
                      name: submittedData?.name 
                    } 
                  })}
                >
                  I Have a Code
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
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
                  >
                    GET MY VAULT CODE
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
  </div>
  );
};

export default EnterVault;
