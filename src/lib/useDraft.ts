"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Draft, SaveState } from "./model";
import { getBlob, getCurrentDraft, getDraft, saveDraft, startNewDraft } from "./store/local";

export type LoadState = "loading" | "ready" | "missing" | "unavailable";

/**
 * Load and edit a draft with honest save states. Edits apply immediately in
 * memory and are written to IndexedDB shortly after (and on page hide), so a
 * refresh never loses work. A failed write keeps the in-memory draft intact.
 */
export function useDraft(id?: string) {
  const [draft, setDraftState] = useState<Draft | undefined>();
  const [load, setLoad] = useState<LoadState>("loading");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const latest = useRef<Draft | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = id ? await getDraft(id) : await getCurrentDraft(false);
        if (!alive) return;
        latest.current = d;
        setDraftState(d);
        setLoad(d || !id ? "ready" : "missing");
      } catch {
        if (alive) setLoad("unavailable");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current || !latest.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      const saved = await saveDraft(latest.current);
      // keep updatedAt in sync without clobbering edits made during the write
      if (latest.current && latest.current.id === saved.id) latest.current = { ...latest.current, updatedAt: saved.updatedAt };
      setSaveState("saved");
    } catch {
      dirty.current = true;
      setSaveState("failed");
    }
  }, []);

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  /** Apply an edit. `immediate` writes now (used after adding media). */
  const update = useCallback(
    async (fn: (d: Draft) => Draft, immediate = false) => {
      let base = latest.current;
      if (!base) base = await getCurrentDraft(true);
      if (!base) return;
      const next = fn(base);
      latest.current = next;
      setDraftState(next);
      dirty.current = true;
      setSaveState("saving");
      if (immediate) return flush();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 350);
    },
    [flush],
  );

  const replace = useCallback((d: Draft) => {
    latest.current = d;
    setDraftState(d);
  }, []);

  const startFresh = useCallback(async (prefill?: Partial<Draft>) => {
    await flush();
    const d = await startNewDraft(prefill);
    latest.current = d;
    setDraftState(d);
    return d;
  }, [flush]);

  return { draft, load, saveState, update, flush, replace, startFresh, retry: flush };
}

/** Object URL for a stored blob, released on unmount or change. */
export function useBlobUrl(blobId?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blobId) return;
    let u: string | undefined;
    let alive = true;
    getBlob(blobId).then((b) => {
      if (!alive || !b) return;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
      setUrl(undefined);
    };
  }, [blobId]);
  return url;
}
