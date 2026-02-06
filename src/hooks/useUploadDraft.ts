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
    if (!userId) return;
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UploadDraft>;
        setDraft({ ...EMPTY_DRAFT, ...parsed });
      }
    } catch (err) {
      console.warn("[useUploadDraft] Failed to load draft:", err);
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
    setDraft(EMPTY_DRAFT);
  }, [userId]);

  // --- Has unsaved content? ---
  const hasDraft =
    !!draft.title.trim() ||
    !!draft.genre ||
    draft.agreementChecked ||
    !!draft.coverMeta ||
    !!draft.audioMeta;

  return { draft, loaded, hasDraft, updateDraft, clearDraft };
}
