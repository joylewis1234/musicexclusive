/** Canonical site URL (SSR / email fallbacks). Production uses www. */
export const APP_URL = "https://www.musicexclusive.co";

export function getAppBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return APP_URL;
}

export function getAuthRedirectBaseUrl() {
  return getAppBaseUrl();
}
