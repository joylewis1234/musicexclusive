import React from "react";
import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  refreshRole: () => Promise<AppRole | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/** Fetch the highest-priority role for a given user id. */
const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) {
    console.error("[AuthContext] Error fetching user role:", error);
    return null;
  }

  // Prioritize admin > artist > fan when user has multiple roles
  const roles = data.map(r => r.role as AppRole);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("artist")) return "artist";
  return roles[0];
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether initial load has completed so the onAuthStateChange
  // listener doesn't race with it.
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // ── 1. Initial load ────────────────────────────────────────────
    // Fetches existing session + role BEFORE setting isLoading=false.
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[AuthContext] getSession error:", error);
        }

        if (!isMounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const userRole = await fetchUserRole(initialSession.user.id);
          if (!isMounted) return;
          setRole(userRole);
          console.debug("[AuthContext] Initial session resolved, role:", userRole);
        } else {
          setRole(null);
          console.debug("[AuthContext] Initial session resolved: no user");
        }
      } catch (err) {
        console.error("[AuthContext] initializeAuth failed:", err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setRole(null);
        }
      } finally {
        if (isMounted) {
          initialLoadDone.current = true;
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // ── 2. Ongoing auth changes ────────────────────────────────────
    // Handles sign-in / sign-out / token refresh AFTER the initial load.
    // Does NOT touch isLoading for the initial boot — only for subsequent
    // sign-in events where we need to re-enter loading while fetching role.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        // Skip if initial load hasn't finished — initializeAuth handles it.
        if (!initialLoadDone.current) {
          console.debug("[AuthContext] onAuthStateChange skipped (initial load pending), event:", event);
          return;
        }

        console.debug("[AuthContext] onAuthStateChange event:", event);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Re-enter loading so route guards wait for role resolution
          setIsLoading(true);
          setRole(null);

          try {
            const userRole = await fetchUserRole(currentSession.user.id);
            if (isMounted) {
              setRole(userRole);
              console.debug("[AuthContext] Role resolved after auth change:", userRole);
            }
          } catch (err) {
            console.error("[AuthContext] Role fetch failed after auth change:", err);
            if (isMounted) setRole(null);
          } finally {
            if (isMounted) setIsLoading(false);
          }
        } else {
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── signUp ─────────────────────────────────────────────────────────
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

      if (data.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: selectedRole });

        if (roleError) {
          console.error("[AuthContext] Error inserting role:", roleError);
          throw roleError;
        }

        setRole(selectedRole);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // ── signIn ─────────────────────────────────────────────────────────
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

  // ── signOut ────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  // ── refreshRole ────────────────────────────────────────────────────
  const refreshRole = async (): Promise<AppRole | null> => {
    const currentUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!currentUser) return null;
    try {
      const userRole = await fetchUserRole(currentUser.id);
      setRole(userRole);
      setIsLoading(false);
      return userRole;
    } catch (err) {
      console.error("[AuthContext] refreshRole failed:", err);
      setIsLoading(false);
      return null;
    }
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
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
