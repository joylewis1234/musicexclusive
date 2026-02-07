import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type ArtistGateResult =
  | "has_profile"           // artist_profiles row exists → allow access
  | "app_approved_pending"  // application approved but no profile yet → setup
  | "app_pending"           // application still under review
  | "app_rejected"          // application rejected
  | "no_record";            // no profile and no application

interface CachedAccess {
  gateResult: ArtistGateResult;
  userId: string;
  timestamp: number;
}

interface UseArtistAccessCacheResult {
  /** The resolved gate result, or null while still verifying for the first time */
  gateResult: ArtistGateResult | null;
  /** True only during the background verification (never blocks UI) */
  isVerifying: boolean;
  /** Non-null if verification failed */
  verificationError: string | null;
  /** Manually retry verification (clears cache) */
  retryVerification: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CACHE_KEY = "artist_access_cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const VERIFY_TIMEOUT_MS = 18_000;     // 18 seconds per attempt

/* ------------------------------------------------------------------ */
/*  Session-storage helpers                                             */
/* ------------------------------------------------------------------ */

function readCache(userId: string): ArtistGateResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedAccess = JSON.parse(raw);
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.gateResult;
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function writeCache(userId: string, gateResult: ArtistGateResult): void {
  try {
    const entry: CachedAccess = { gateResult, userId, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — non-critical
  }
}

function clearCache(): void {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Core verification logic (no UI, pure async)                         */
/* ------------------------------------------------------------------ */

async function verifyArtistAccess(
  userId: string,
  email: string,
  signal: AbortSignal,
): Promise<ArtistGateResult> {
  // 1. Check artist_profiles
  const { data: profile, error: profileError } = await supabase
    .from("artist_profiles")
    .select("id")
    .eq("user_id", userId)
    .abortSignal(signal)
    .maybeSingle();

  if (profileError && !signal.aborted) {
    console.error("[ArtistAccessCache] Profile check error:", profileError);
  }

  if (profile) return "has_profile";

  // 2. Fallback: check artist_applications by email
  const normalizedEmail = email.trim().toLowerCase();
  const { data: applications, error: appError } = await supabase
    .from("artist_applications")
    .select("status")
    .ilike("contact_email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .abortSignal(signal);

  if (appError && !signal.aborted) {
    console.error("[ArtistAccessCache] Application check error:", appError);
    // If we can't check, don't block
    return "has_profile";
  }

  const application = applications?.[0] ?? null;
  if (!application) return "no_record";

  switch (application.status) {
    case "active":
    case "approved":
      return "has_profile";
    case "approved_pending_setup":
      return "app_approved_pending";
    case "pending":
      return "app_pending";
    case "rejected":
    case "not_approved":
      return "app_rejected";
    default:
      return "app_pending";
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useArtistAccessCache(): UseArtistAccessCacheResult {
  const { user, role } = useAuth();
  const [gateResult, setGateResult] = useState<ArtistGateResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Track whether we've already run for this user to avoid duplicate runs
  const verifiedUserIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  const runVerification = useCallback(async (userId: string, email: string, isRetry = false) => {
    const startTime = Date.now();
    const usingCache = false;

    console.log(`[ArtistAccessCache] Verification started`, {
      userId: userId.slice(0, 8),
      role,
      usingCache,
      isRetry,
      retryCount: retryCountRef.current,
    });

    setIsVerifying(true);
    setVerificationError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    try {
      const result = await verifyArtistAccess(userId, email, controller.signal);
      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      console.log(`[ArtistAccessCache] Verification succeeded`, {
        userId: userId.slice(0, 8),
        result,
        durationMs: duration,
      });

      setGateResult(result);
      writeCache(userId, result);
      verifiedUserIdRef.current = userId;
      retryCountRef.current = 0;
    } catch (err: any) {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      const message = String(err?.message ?? "").toLowerCase();
      const isAbort =
        err?.name === "AbortError" ||
        message.includes("signal is aborted") ||
        message.includes("aborted") ||
        message.includes("cancelled") ||
        message.includes("canceled");

      if (isAbort) {
        console.warn(`[ArtistAccessCache] Verification timed out`, {
          userId: userId.slice(0, 8),
          durationMs: duration,
          retryCount: retryCountRef.current,
        });
      } else {
        console.error(`[ArtistAccessCache] Verification failed`, {
          userId: userId.slice(0, 8),
          error: err,
          durationMs: duration,
        });
      }

      // Automatic single retry on first failure
      if (retryCountRef.current === 0 && !isRetry) {
        retryCountRef.current = 1;
        console.log(`[ArtistAccessCache] Auto-retrying verification…`);
        // Don't await — let it run in background
        runVerification(userId, email, true);
        return;
      }

      // After retry exhausted, show error but DON'T redirect
      setVerificationError("Artist verification timed out. You can continue using the app.");
      // Default to allowing access on error (don't block the artist)
      setGateResult("has_profile");
      verifiedUserIdRef.current = userId;
    } finally {
      setIsVerifying(false);
    }
  }, [role]);

  // Main effect: check cache, or run verification once per user
  useEffect(() => {
    if (!user || role !== "artist") {
      setGateResult(null);
      verifiedUserIdRef.current = null;
      return;
    }

    // Already verified for this user in this session (in-memory)
    if (verifiedUserIdRef.current === user.id && gateResult !== null) {
      return;
    }

    // Check sessionStorage cache
    const cached = readCache(user.id);
    if (cached) {
      console.log(`[ArtistAccessCache] Using cached result`, {
        userId: user.id.slice(0, 8),
        cachedResult: cached,
      });
      setGateResult(cached);
      verifiedUserIdRef.current = user.id;
      return;
    }

    // No cache — run verification in background
    retryCountRef.current = 0;
    runVerification(user.id, user.email ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  const retryVerification = useCallback(() => {
    if (!user) return;
    clearCache();
    verifiedUserIdRef.current = null;
    retryCountRef.current = 0;
    setGateResult(null);
    setVerificationError(null);
    runVerification(user.id, user.email ?? "");
  }, [user, runVerification]);

  return { gateResult, isVerifying, verificationError, retryVerification };
}
