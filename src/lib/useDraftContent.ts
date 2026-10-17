"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Draft, PostcardContent } from "./model";
import { getBlob } from "./store/local";

/**
 * Live PostcardContent for a draft, for the editor's preview. Object URLs are
 * cached per blob id and released when no longer referenced, so typing in the
 * note doesn't churn image URLs.
 */
export function useDraftContent(draft: Draft | undefined): PostcardContent | undefined {
  const cache = useRef(new Map<string, string>());
  const [urls, setUrls] = useState<Record<string, string>>({});

  const ids = useMemo(() => {
    if (!draft) return [];
    return [...draft.moments.map((m) => m.photoId), ...(draft.voice ? [draft.voice.blobId] : [])];
  }, [draft]);
  const key = ids.join("|");

  useEffect(() => {
    let alive = true;
    const wanted = new Set(key ? key.split("|") : []);
    for (const [id, url] of cache.current) {
      if (!wanted.has(id)) {
        URL.revokeObjectURL(url);
        cache.current.delete(id);
      }
    }
    const missing = [...wanted].filter((id) => !cache.current.has(id));
    if (missing.length === 0) {
      setUrls(Object.fromEntries(cache.current));
      return;
    }
    Promise.all(missing.map(async (id) => [id, await getBlob(id)] as const)).then((pairs) => {
      if (!alive) return;
      for (const [id, blob] of pairs) if (blob) cache.current.set(id, URL.createObjectURL(blob));
      setUrls(Object.fromEntries(cache.current));
    });
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    const c = cache.current;
    return () => {
      for (const url of c.values()) URL.revokeObjectURL(url);
      c.clear();
    };
  }, []);

  return useMemo(() => {
    if (!draft) return undefined;
    const url = (id: string) => urls[id] ?? "";
    return {
      id: draft.id,
      title: draft.title,
      note: draft.note,
      senderName: draft.senderName,
      recipientName: draft.recipient.name,
      fromPlace: draft.fromPlace,
      toPlace: draft.recipient.place,
      day: draft.day,
      timeZone: draft.timeZone,
      stamp: draft.stamp,
      moments: draft.moments
        .map((m) => ({ id: m.id, caption: m.caption, capturedAt: m.capturedAt, width: m.width, height: m.height, src: url(m.photoId) }))
        .filter((m) => m.src),
      voice: draft.voice && url(draft.voice.blobId) ? { src: url(draft.voice.blobId), mimeType: draft.voice.mimeType, durationSec: draft.voice.durationSec } : undefined,
      written: draft.written?.text.trim() ? draft.written : undefined,
    };
  }, [draft, urls]);
}
