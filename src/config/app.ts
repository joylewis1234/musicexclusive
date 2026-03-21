export const APP_URL = "https://musicexclusive.co";

const LOCAL_APP_ORIGINS = new Set([
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

export function getAuthRedirectBaseUrl() {
  if (typeof window !== "undefined" && LOCAL_APP_ORIGINS.has(window.location.origin)) {
    return window.location.origin;
  }

  return APP_URL;
}
