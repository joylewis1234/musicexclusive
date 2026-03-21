let fanAuthPreloadPromise: Promise<unknown> | null = null;

export function preloadFanAuthRoute() {
  if (!fanAuthPreloadPromise) {
    fanAuthPreloadPromise = import("@/pages/auth/FanAuth").catch((error) => {
      fanAuthPreloadPromise = null;
      throw error;
    });
  }

  return fanAuthPreloadPromise;
}

export function warmFanAuthRoute() {
  void preloadFanAuthRoute().catch((error) => {
    console.warn("[preloadFanAuthRoute] Preload failed:", error);
  });
}
