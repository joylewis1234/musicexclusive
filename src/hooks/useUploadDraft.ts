/**
 * useUploadDraft – localStorage-backed persistence for the upload form.
 *
 * Stores text fields, checkbox, cover preview (tiny base64), and file
 * metadata (NOT the actual blobs) so the form survives navigation.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { CoverArtMeta, AudioMeta } from "@/utils/uploadHelpers";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface UploadDraft {
  title: string;
  genre: string;
  agreementChecked: boolean;
  coverPreview: string | null;        // base64 data-url (tiny thumbnail)
  coverMeta: CoverArtMeta | null;
  audioMeta: AudioMeta | null;
}

const EMPTY_DRAFT: UploadDraft = {
  title: "",
  genre: "",
  agreementChecked: false,
  coverPreview: null,
  coverMeta: null,
  audioMeta: null,
};

/**
 * Sanitise a draft loaded from localStorage so every field has the
 * expected type.  Corrupt / missing values are silently reset to
 * their EMPTY_DRAFT defaults.
 */
function sanitiseDraft(raw: unknown): UploadDraft {
  if (!raw || typeof raw !== "object") return { ...EMPTY_DRAFT };

  const d = raw as Record<string, unknown>;

  // Extra safety: if title is null / number / array etc., coerce to ""
  let title = "";
  try {
    title = typeof d.title === "string" ? d.title : "";
  } catch {
    title = "";
  }

  let genre = "";
  try {
    genre = typeof d.genre === "string" ? d.genre : "";
  } catch {
    genre = "";
  }

  return {
    title,
    genre,
    agreementChecked: d.agreementChecked === true,
    coverPreview: typeof d.coverPreview === "string" ? d.coverPreview : null,
    coverMeta: d.coverMeta && typeof d.coverMeta === "object" ? (d.coverMeta as UploadDraft["coverMeta"]) : null,
    audioMeta: d.audioMeta && typeof d.audioMeta === "object" ? (d.audioMeta as UploadDraft["audioMeta"]) : null,
  };
}

function storageKey(userId: string) {
  return `upload_draft_${userId}`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useUploadDraft(userId: string | undefined) {
  const [draft, setDraft] = useState<UploadDraft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load on mount ---
  useEffect(() => {
    if (!userId) {
      setLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        const safe = sanitiseDraft(parsed);
        console.debug("[ArtistUpload] Draft loaded from localStorage", { userId, hasDraftContent: !!(safe.title || safe.genre || safe.coverMeta || safe.audioMeta) });
        setDraft(safe);
      }
    } catch (err) {
      console.error("[ArtistUpload] Failed to load draft – clearing corrupt data:", err);
      try { localStorage.removeItem(storageKey(userId)); } catch { /* ignore */ }
    }
    setLoaded(true);
  }, [userId]);

  // --- Debounced save ---
  const persist = useCallback(
    (next: UploadDraft) => {
      if (!userId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey(userId), JSON.stringify(next));
        } catch (err) {
          console.warn("[useUploadDraft] Failed to save draft:", err);
        }
      }, 300);
    },
    [userId]
  );

  // --- Update helpers ---
  const updateDraft = useCallback(
    (partial: Partial<UploadDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...partial };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // --- Clear ---
  const clearDraft = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(storageKey(userId));
    } catch {
      // ignore
    }
    setDraft({ ...EMPTY_DRAFT });
  }, [userId]);

  // --- Has unsaved content? (completely null-safe) ---
  const hasDraft = (() => {
    try {
      return (
        !!(typeof draft.title === "string" && draft.title.trim()) ||
        !!(typeof draft.genre === "string" && draft.genre) ||
        draft.agreementChecked === true ||
        draft.coverMeta != null ||
        draft.audioMeta != null
      );
    } catch {
      return false;
    }
  })();

  return { draft, loaded, hasDraft, updateDraft, clearDraft };
}
