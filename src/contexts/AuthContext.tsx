import React from "react";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "fan" | "artist" | "admin";

const ACTIVE_ROLE_KEY = "me_active_role";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  userRoles: AppRole[];
  isLoading: boolean;
  signUp: (email: string, password: string, role: AppRole, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<AppRole | null>;
  setActiveRole: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/** Fetch all roles for a given user id. */
const fetchUserRoles = async (userId: string): Promise<AppRole[]> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) {
    console.error("[AuthContext] Error fetching user roles:", error);
    return [];
  }

  return data.map(r => r.role as AppRole);
};

/** Pick the best role from a list, respecting sessionStorage preference. */
const pickActiveRole = (roles: AppRole[]): AppRole | null => {
  if (roles.length === 0) return null;

  // Check if there's a stored preference that the user actually has
  try {
    const stored = sessionStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null;
    if (stored && roles.includes(stored)) return stored;
  } catch { /* ignore */ }

  // Default: admin > artist > fan
  if (roles.includes("admin")) return "admin";
  if (roles.includes("artist")) return "artist";
  return roles[0];
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether initial load has completed so the onAuthStateChange
  // listener doesn't race with it.
  const initialLoadDone = useRef(false);

  // ── setActiveRole ──────────────────────────────────────────────────
  const setActiveRole = (newRole: AppRole) => {
    try { sessionStorage.setItem(ACTIVE_ROLE_KEY, newRole); } catch { /* ignore */ }
    setRole(newRole);
  };

  useEffect(() => {
    let isMounted = true;

    // ── 1. Initial load ────────────────────────────────────────────
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
          const roles = await fetchUserRoles(initialSession.user.id);
          if (!isMounted) return;
          setUserRoles(roles);
          const activeRole = pickActiveRole(roles);
          setRole(activeRole);
          console.debug("[AuthContext] Initial session resolved, roles:", roles, "active:", activeRole);
        } else {
          setRole(null);
          setUserRoles([]);
          console.debug("[AuthContext] Initial session resolved: no user");
        }
      } catch (err) {
        console.error("[AuthContext] initializeAuth failed:", err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setRole(null);
          setUserRoles([]);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        if (!initialLoadDone.current) {
          console.debug("[AuthContext] onAuthStateChange skipped (initial load pending), event:", event);
          return;
        }

        console.debug("[AuthContext] onAuthStateChange event:", event);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const isNewSignIn = event === "SIGNED_IN" || event === "USER_UPDATED";
          const isSameUser = currentSession.user.id === user?.id;

          // If the same user is already fully resolved, skip re-verification.
          // This prevents the spinner from showing when the phone wakes up
          // and Supabase fires SIGNED_IN after a token refresh.
          if (isSameUser && role && userRoles.length > 0) {
            console.debug("[AuthContext] Same user already resolved, skipping re-fetch for event:", event);
            return;
          }

          if (isNewSignIn || !role) {
            setIsLoading(true);
            setRole(null);

            try {
              const roles = await fetchUserRoles(currentSession.user.id);
              if (isMounted) {
                setUserRoles(roles);
                const activeRole = pickActiveRole(roles);
                setRole(activeRole);
                console.debug("[AuthContext] Role resolved after auth change:", activeRole, "all:", roles);
              }
            } catch (err) {
              console.error("[AuthContext] Role fetch failed after auth change:", err);
              if (isMounted) { setRole(null); setUserRoles([]); }
            } finally {
              if (isMounted) setIsLoading(false);
            }
          } else {
            console.debug("[AuthContext] Skipping role re-fetch for event:", event);
          }
        } else {
          setRole(null);
          setUserRoles([]);
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
        setUserRoles(prev => prev.includes(selectedRole) ? prev : [...prev, selectedRole]);
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
    try { sessionStorage.removeItem(ACTIVE_ROLE_KEY); } catch { /* ignore */ }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setUserRoles([]);
  };

  // ── refreshRole ────────────────────────────────────────────────────
  const refreshRole = async (): Promise<AppRole | null> => {
    const currentUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!currentUser) return null;
    try {
      const roles = await fetchUserRoles(currentUser.id);
      setUserRoles(roles);
      const activeRole = pickActiveRole(roles);
      setRole(activeRole);
      setIsLoading(false);
      return activeRole;
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
        userRoles,
        isLoading,
        signUp,
        signIn,
        signOut,
        refreshRole,
        setActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
