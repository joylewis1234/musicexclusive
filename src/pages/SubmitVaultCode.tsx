import { useState } from "react";
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
  FormMessage,
} from "@/components/ui/form";
import { Unlock, ChevronLeft, Home } from "lucide-react";

// Temporary: accept any non-empty code for client-side demo
const formSchema = z.object({
  vaultCode: z
    .string()
    .trim()
    .min(1, { message: "Please enter your vault code" }),
});

type FormValues = z.infer<typeof formSchema>;

interface LocationState {
  email?: string;
  name?: string;
}

const SubmitVaultCode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vaultCode: "",
    },
  });

  // Temporary client-side only submission
  const onSubmit = (values: FormValues) => {
    setIsLoading(true);
    
    // Simulate a brief delay for UX
    setTimeout(() => {
      // Navigate to vault status with "in_draw" state
      navigate("/vault/status", { 
        state: { 
          email: state?.email || "demo@example.com", 
          name: state?.name || "Vault Member",
          vaultState: "in_draw"
        } 
      });
    }, 500);
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
                          placeholder="Enter your code"
                          {...field}
                          className="h-14 text-center text-xl tracking-[0.3em] font-display uppercase bg-muted/30 border-border focus:border-primary/50 placeholder:tracking-normal placeholder:text-sm"
                          autoComplete="off"
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
  </div>
  );
};

export default SubmitVaultCode;
