// The local store against a real IndexedDB implementation (fake-indexeddb).
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/model";
import {
  collectGarbage,
  createSnapshot,
  db,
  deleteDraft,
  getBlob,
  getCurrentDraft,
  getDraft,
  getSnapshot,
  putBlob,
  saveDraft,
} from "@/lib/store/local";

beforeEach(async () => {
  const d = await db();
  for (const s of ["drafts", "blobs", "snapshots", "meta"] as const) await d.clear(s);
});

const photo = (n: number) => new Blob([new Uint8Array(n).fill(n)], { type: "image/jpeg" });

describe("local drafts", () => {
  it("creates the current draft lazily and restores it", async () => {
    expect(await getCurrentDraft(false)).toBeUndefined();
    const d = await getCurrentDraft(true);
    expect(d).toBeDefined();
    expect((await getCurrentDraft(false))?.id).toBe(d!.id);
  });

  it("persists moments, captions and order", async () => {
    const d = emptyDraft();
    const ids = await Promise.all([1, 2, 3].map((n) => putBlob(photo(n))));
    d.moments = ids.map((photoId, i) => ({ id: `m${i}`, photoId, caption: `c${i}`, capturedAt: "", width: 10, height: 10 }));
    d.moments.reverse();
    await saveDraft(d);
    const back = await getDraft(d.id);
    expect(back!.moments.map((m) => m.caption)).toEqual(["c2", "c1", "c0"]);
    expect(await getBlob(back!.moments[0].photoId)).toBeDefined();
  });
});

describe("snapshots", () => {
  it("freeze content: later draft edits never change a ready version", async () => {
    const d = emptyDraft();
    const pid = await putBlob(photo(4));
    d.moments = [{ id: "m", photoId: pid, caption: "Eggs", capturedAt: "", width: 10, height: 10 }];
    d.note = "Original note";
    await saveDraft(d);
    const snap = await createSnapshot(d);
    await saveDraft({ ...d, note: "Edited later", moments: [] });
    const reread = await getSnapshot(snap.id);
    expect(reread!.content.note).toBe("Original note");
    expect(reread!.content.moments).toHaveLength(1);
  });

  it("number versions per draft", async () => {
    const d = await saveDraft(emptyDraft());
    const a = await createSnapshot(d);
    const b = await createSnapshot(d);
    expect([a.version, b.version]).toEqual([1, 2]);
    expect((await getDraft(d.id))!.lastSnapshotId).toBe(b.id);
  });

  it("keep their photos when the draft that made them is deleted", async () => {
    const d = emptyDraft();
    const pid = await putBlob(photo(5));
    d.moments = [{ id: "m", photoId: pid, caption: "", capturedAt: "", width: 10, height: 10 }];
    await saveDraft(d);
    await createSnapshot(d);
    await deleteDraft(d.id);
    expect(await getBlob(pid)).toBeDefined();
  });
});

describe("cleanup", () => {
  it("removes abandoned photos nothing references", async () => {
    const kept = await putBlob(photo(6));
    const abandoned = await putBlob(photo(7));
    const d = emptyDraft();
    d.moments = [{ id: "m", photoId: kept, caption: "", capturedAt: "", width: 10, height: 10 }];
    await saveDraft(d);
    expect(await collectGarbage()).toBe(1);
    expect(await getBlob(kept)).toBeDefined();
    expect(await getBlob(abandoned)).toBeUndefined();
  });
});
