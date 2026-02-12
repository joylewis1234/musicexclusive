import { useSyncExternalStore } from "react";
import { getDebugLines, subscribeDebugLines, type DebugLine } from "@/utils/debugLog";

export function useDebugLogs(): DebugLine[] {
  return useSyncExternalStore(
    subscribeDebugLines,
    getDebugLines,
    getDebugLines,
  );
}
