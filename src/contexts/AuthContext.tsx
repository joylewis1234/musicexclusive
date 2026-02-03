import React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "fan" | "artist" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  signUp: (email: string, password: string, role: AppRole, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isBenignAbortError = (err: unknown) => {
    const anyErr = err as any;
    const name = String(anyErr?.name ?? "");
    const message = String(anyErr?.message ?? anyErr ?? "").toLowerCase();
    return (
      name === "AbortError" ||
      message.includes("signal is aborted") ||
      message.includes("request cancelled") ||
      message.includes("request canceled") ||
      message.includes("cancelled") ||
      message.includes("canceled")
    );
  };

  const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (error || !data || data.length === 0) {
      console.error("Error fetching user role:", error);
      return null;
    }
    
    // Prioritize admin > artist > fan when user has multiple roles
    const roles = data.map(r => r.role as AppRole);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("artist")) return "artist";
    return roles[0];
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Important: we may already be "not loading" from initial app boot.
          // When a user signs in, we must re-enter a loading state while we fetch their role,
          // otherwise route guards can evaluate with user!=null but role==null and incorrectly
          // redirect to /access-restricted.
          setIsLoading(true);
          setRole(null);

          // Defer role fetch to avoid blocking
          setTimeout(async () => {
            try {
              const userRole = await fetchUserRole(currentSession.user.id);
              setRole(userRole);
            } catch (err) {
              if (!isBenignAbortError(err)) {
                console.error("[AuthContext] Role fetch failed:", err);
              }
              // Keep role null; route guards will treat this as loading.
              setRole(null);
            } finally {
              setIsLoading(false);
            }
          }, 0);
        } else {
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession }, error }) => {
      if (error && !isBenignAbortError(error)) {
        console.error("[AuthContext] getSession error:", error);
      }

      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      try {
        if (existingSession?.user) {
          const userRole = await fetchUserRole(existingSession.user.id);
          setRole(userRole);
        }
      } catch (err) {
        if (!isBenignAbortError(err)) {
          console.error("[AuthContext] Initial role fetch failed:", err);
        }
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    selectedRole: AppRole,
    displayName?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName || email.split("@")[0],
          },
        },
      });

      if (error) throw error;

      // Insert role after signup
      if (data.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: selectedRole });
        
        if (roleError) {
          console.error("Error inserting role:", roleError);
          throw roleError;
        }
        
        setRole(selectedRole);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
