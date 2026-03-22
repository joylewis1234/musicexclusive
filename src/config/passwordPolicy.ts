/** Single minimum length for new passwords across signup, reset, claim, and verification. */
export const MIN_PASSWORD_LENGTH = 8;

/** User-facing copy; keep trailing period consistent for toasts and server errors. */
export const PASSWORD_MIN_LENGTH_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** Server or Supabase errors that indicate password is too short. */
export function isPasswordLengthErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("at least") && m.includes("character")) ||
    m.includes("password_too_short")
  );
}

/**
 * Breach / weak-password style errors from Supabase Auth.
 * Excludes length errors so we don't show breach copy for "too short".
 */
export function isPasswordWeakOrBreachedMessage(message: string): boolean {
  if (!message.trim()) return false;
  if (isPasswordLengthErrorMessage(message)) return false;
  const m = message.toLowerCase();
  return (
    m.includes("breach") ||
    m.includes("pwned") ||
    m.includes("easy to guess") ||
    m.includes("too weak") ||
    m.includes("commonly used") ||
    (m.includes("password") && (m.includes("weak") || m.includes("insecure")))
  );
}
