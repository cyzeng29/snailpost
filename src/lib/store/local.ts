// Local persistence: drafts, media blobs and frozen snapshots in IndexedDB.
// This is honest local-only storage. It never makes a postcard reachable from
// another device; cross-device links go through the publishing backend.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { emptyDraft, newId, type Draft, type PostcardContent, type Snapshot } from "../model";

interface SnailDB extends DBSchema {
  drafts: { key: string; value: Draft; indexes: { byUpdated: string } };
  // Bytes are stored as an ArrayBuffer, not a Blob: WebKit rejects Blobs in
  // IndexedDB in ephemeral sessions (e.g. Safari private browsing).
  blobs: { key: string; value: { id: string; data: ArrayBuffer; type: string; createdAt: string } };
  snapshots: { key: string; value: Snapshot; indexes: { byDraft: string } };
  meta: { key: string; value: { key: string; value: string } };
}

const DB_NAME = "snailpost";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SnailDB>> | null = null;

export function db() {
  if (!dbPromise) {
    dbPromise = openDB<SnailDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        const drafts = d.createObjectStore("drafts", { keyPath: "id" });
        drafts.createIndex("byUpdated", "updatedAt");
        d.createObjectStore("blobs", { keyPath: "id" });
        const snaps = d.createObjectStore("snapshots", { keyPath: "id" });
        snaps.createIndex("byDraft", "draftId");
        d.createObjectStore("meta", { keyPath: "key" });
      },
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/* ---------------- meta ---------------- */

async function getMeta(key: string) {
  return (await (await db()).get("meta", key))?.value;
}
async function setMeta(key: string, value: string | null) {
  const d = await db();
  if (value === null) await d.delete("meta", key);
  else await d.put("meta", { key, value });
}

/* ---------------- blobs ---------------- */

export async function putBlob(blob: Blob) {
  const id = newId("b_");
  const data = await blob.arrayBuffer();
  await (await db()).put("blobs", { id, data, type: blob.type, createdAt: new Date().toISOString() });
  return id;
}

export async function getBlob(id: string) {
  const rec = await (await db()).get("blobs", id);
  return rec ? new Blob([rec.data], { type: rec.type }) : undefined;
}

/** Delete blobs no draft or snapshot references any more (abandoned uploads, replaced photos). */
export async function collectGarbage() {
  const d = await db();
  const used = new Set<string>();
  for (const dr of await d.getAll("drafts")) {
    dr.moments.forEach((m) => used.add(m.photoId));
    if (dr.voice) used.add(dr.voice.blobId);
  }
  for (const s of await d.getAll("snapshots")) {
    s.content.moments.forEach((m) => used.add(m.photoId));
    if (s.content.voice) used.add(s.content.voice.blobId);
  }
  const tx = d.transaction("blobs", "readwrite");
  let removed = 0;
  for (const key of await tx.store.getAllKeys()) {
    if (!used.has(key)) {
      await tx.store.delete(key);
      removed++;
    }
  }
  await tx.done;
  return removed;
}

/* ---------------- drafts ---------------- */

export async function getDraft(id: string) {
  return (await db()).get("drafts", id);
}

export async function saveDraft(draft: Draft) {
  const next = { ...draft, updatedAt: new Date().toISOString() };
  await (await db()).put("drafts", next);
  return next;
}

export async function listDrafts() {
  const all = await (await db()).getAllFromIndex("drafts", "byUpdated");
  return all.reverse();
}

export async function deleteDraft(id: string) {
  await (await db()).delete("drafts", id);
  if ((await getMeta("currentDraftId")) === id) await setMeta("currentDraftId", null);
  await collectGarbage();
}

/**
 * Today's working draft: the one the sender is currently collecting into.
 * Created lazily so a first visit never writes anything until needed.
 */
export async function getCurrentDraft(create = false): Promise<Draft | undefined> {
  const id = await getMeta("currentDraftId");
  if (id) {
    const d = await getDraft(id);
    if (d) return d;
  }
  if (!create) return undefined;
  const d = await saveDraft(emptyDraft());
  await setMeta("currentDraftId", d.id);
  return d;
}

export async function setCurrentDraft(id: string | null) {
  await setMeta("currentDraftId", id);
}

/** Start a fresh day: keep the old draft in Keepsakes, collect into a new one. */
export async function startNewDraft(prefill?: Partial<Draft>) {
  const d = await saveDraft({ ...emptyDraft(), ...prefill });
  await setMeta("currentDraftId", d.id);
  return d;
}

/* ---------------- snapshots ---------------- */

/**
 * Freeze the draft as the sender reviewed it. Later draft edits never change
 * this copy; a further "Ready to share" creates a new version.
 */
export async function createSnapshot(draft: Draft): Promise<Snapshot> {
  const d = await db();
  const previous = await d.getAllFromIndex("snapshots", "byDraft", draft.id);
  const version = previous.reduce((m, s) => Math.max(m, s.version), 0) + 1;
  const snap: Snapshot = {
    id: newId("s_"),
    draftId: draft.id,
    version,
    createdAt: new Date().toISOString(),
    content: {
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
      moments: draft.moments.map((m) => ({
        id: m.id,
        caption: m.caption,
        capturedAt: m.capturedAt,
        width: m.width,
        height: m.height,
        photoId: m.photoId,
      })),
      voice: draft.voice
        ? { blobId: draft.voice.blobId, mimeType: draft.voice.mimeType, durationSec: draft.voice.durationSec }
        : undefined,
      written: draft.written?.text.trim() ? draft.written : undefined,
    },
  };
  await d.put("snapshots", snap);
  await saveDraft({ ...draft, lastSnapshotId: snap.id });
  return snap;
}

export async function getSnapshot(id: string) {
  return (await db()).get("snapshots", id);
}

export async function updateSnapshot(snap: Snapshot) {
  await (await db()).put("snapshots", snap);
}

export async function listSnapshots() {
  const all = await (await db()).getAll("snapshots");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteSnapshot(id: string) {
  await (await db()).delete("snapshots", id);
  await collectGarbage();
}

/* ---------------- resolving media for rendering ---------------- */

/**
 * Turn a draft or snapshot into renderable content with object URLs.
 * The caller must call `release()` when done so blob URLs don't leak.
 */
export async function resolveContent(
  source: { kind: "draft"; draft: Draft } | { kind: "snapshot"; snapshot: Snapshot },
): Promise<{ content: PostcardContent; release: () => void }> {
  const urls: string[] = [];
  const url = async (blobId: string) => {
    const blob = await getBlob(blobId);
    if (!blob) return "";
    const u = URL.createObjectURL(blob);
    urls.push(u);
    return u;
  };
  let content: PostcardContent;
  if (source.kind === "draft") {
    const dr = source.draft;
    content = {
      id: dr.id,
      title: dr.title,
      note: dr.note,
      senderName: dr.senderName,
      recipientName: dr.recipient.name,
      fromPlace: dr.fromPlace,
      toPlace: dr.recipient.place,
      day: dr.day,
      timeZone: dr.timeZone,
      stamp: dr.stamp,
      moments: await Promise.all(
        dr.moments.map(async (m) => ({
          id: m.id,
          caption: m.caption,
          capturedAt: m.capturedAt,
          width: m.width,
          height: m.height,
          src: await url(m.photoId),
        })),
      ),
      voice: dr.voice
        ? { src: await url(dr.voice.blobId), mimeType: dr.voice.mimeType, durationSec: dr.voice.durationSec }
        : undefined,
      written: dr.written?.text.trim() ? dr.written : undefined,
    };
  } else {
    const c = source.snapshot.content;
    content = {
      ...c,
      moments: await Promise.all(c.moments.map(async ({ photoId, ...m }) => ({ ...m, src: await url(photoId) }))),
      voice: c.voice ? { src: await url(c.voice.blobId), mimeType: c.voice.mimeType, durationSec: c.voice.durationSec } : undefined,
    };
  }
  return { content, release: () => urls.forEach((u) => URL.revokeObjectURL(u)) };
}

/** Feature check: some private-browsing modes block IndexedDB entirely. */
export async function storageAvailable() {
  try {
    await db();
    return true;
  } catch {
    return false;
  }
}
