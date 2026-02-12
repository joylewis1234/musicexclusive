/**
 * Global in-memory + localStorage debug logger.
 * Stores the last 200 lines with timestamps.
 */

const MAX_LINES = 200;
const LS_KEY = "upload_debug_logs";

export interface DebugLine {
  ts: string;
  msg: string;
}

let lines: DebugLine[] = [];
let listeners: Set<() => void> = new Set();

// Hydrate from localStorage on module load
try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) lines = parsed.slice(-MAX_LINES);
  }
} catch {
  // ignore
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(lines));
  } catch {
    // ignore quota errors
  }
}

export function debugLog(message: string) {
  const entry: DebugLine = {
    ts: new Date().toISOString(),
    msg: message,
  };
  lines.push(entry);
  if (lines.length > MAX_LINES) {
    lines = lines.slice(-MAX_LINES);
  }
  persist();
  listeners.forEach((fn) => fn());
}

export function getDebugLines(): DebugLine[] {
  return lines;
}

export function clearDebugLines() {
  lines = [];
  persist();
  listeners.forEach((fn) => fn());
}

export function subscribeDebugLines(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
