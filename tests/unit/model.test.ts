import { describe, expect, it } from "vitest";
import { pickRecordingMime, precheckAudio } from "@/lib/audio";
import { layoutFor, tilt } from "@/lib/layout";
import { fitWithin, isHeic, precheckImage } from "@/lib/media";
import { formatDay, formatMomentTime, isoWithOffset, moveItem, NOTE_LIMIT, readiness, suggestTitle } from "@/lib/model";

describe("model helpers", () => {
  it("moves items without mutating, and ignores out-of-range moves", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(list, 0, 9)).toBe(list);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("shows the sender's own clock time, regardless of the viewer's zone", () => {
    expect(formatMomentTime("2026-10-15T08:12:00-04:00")).toBe("8:12 am");
    expect(formatMomentTime("2026-10-15T00:05:00+08:00")).toBe("12:05 am");
    expect(formatMomentTime("2026-10-15T19:30:00-04:00")).toBe("7:30 pm");
  });

  it("formats the sender's day without shifting it across zones", () => {
    expect(formatDay("2026-10-15")).toBe("Thursday, October 15");
    expect(formatDay("2026-10-15", { year: true })).toBe("Thursday, October 15, 2026");
  });

  it("keeps the local offset in captured timestamps", () => {
    expect(isoWithOffset(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it("suggests a title from counts only, never invented events", () => {
    expect(suggestTitle(4, "2026-10-15")).toBe("Four little things from Thursday");
    expect(suggestTitle(1, "2026-10-15")).toBe("One little thing from Thursday");
  });

  it("requires a moment and a short-enough note", () => {
    expect(readiness({ moments: [], note: "", title: "" })).toContain("Add at least one moment.");
    const m = { id: "m", photoId: "p", caption: "", capturedAt: "", width: 1, height: 1 };
    expect(readiness({ moments: [m], note: "x".repeat(NOTE_LIMIT + 1), title: "" })).toHaveLength(1);
    expect(readiness({ moments: [m], note: "ok", title: "ok" })).toEqual([]);
  });
});

describe("layout engine", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `m_${i}`);

  it("picks an intentional layout for every count from 1 to 6", () => {
    expect(layoutFor(ids(1)).kind).toBe("hero");
    expect(layoutFor(ids(2)).kind).toBe("pair");
    expect(layoutFor(ids(3)).kind).toBe("trio");
    expect(layoutFor(ids(4)).kind).toBe("grid");
    expect(layoutFor(ids(5)).kind).toBe("sequence");
    expect(layoutFor(ids(6)).kind).toBe("sequence");
  });

  it("returns one frame per moment, inside the photo area, in order", () => {
    for (let n = 1; n <= 6; n++) {
      const { frames } = layoutFor(ids(n));
      expect(frames).toHaveLength(n);
      for (const f of frames) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(100.01);
        expect(f.y + f.h).toBeLessThanOrEqual(100.01);
      }
    }
    // five moments: three on top, two centred below, read left to right
    const five = layoutFor(ids(5)).frames;
    expect(five[3].y).toBeGreaterThan(five[0].y);
    expect(five[3].x).toBeGreaterThan(five[0].x);
  });

  it("derives the same small tilt from the same id on every render", () => {
    expect(tilt("abc")).toBe(tilt("abc"));
    for (const id of ["a", "b", "zzz", "m_42"]) expect(Math.abs(tilt(id, 6))).toBeLessThanOrEqual(6);
  });
});

describe("photo intake checks", () => {
  const f = (name: string, type: string, size = 1000) => ({ name, type, size });
  it("accepts common phone formats", () => {
    expect(precheckImage(f("a.jpg", "image/jpeg"))).toBeNull();
    expect(precheckImage(f("a.png", "image/png"))).toBeNull();
    expect(precheckImage(f("a.webp", "image/webp"))).toBeNull();
  });
  it("rejects empty, oversized and non-image files with a reason", () => {
    expect(precheckImage(f("a.jpg", "image/jpeg", 0))).toBe("empty");
    expect(precheckImage(f("a.jpg", "image/jpeg", 31 * 1024 * 1024))).toBe("too-large");
    expect(precheckImage(f("a.pdf", "application/pdf"))).toBe("unsupported");
    expect(precheckImage(f("notes.txt", ""))).toBe("unsupported");
  });
  it("defers HEIC to whether this browser can decode it", () => {
    expect(isHeic(f("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeic(f("x", "image/heif"))).toBe(true);
    expect(precheckImage(f("IMG_0001.heic", "image/heic"))).toBeNull();
  });
  it("resizes large photos to a sensible long edge, never upscaling", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("voice helpers", () => {
  it("negotiates the first supported recording format", () => {
    expect(pickRecordingMime((t) => t === "audio/webm;codecs=opus")).toBe("audio/webm;codecs=opus");
    expect(pickRecordingMime((t) => t.startsWith("audio/mp4"))).toBe("audio/mp4;codecs=mp4a.40.2");
    expect(pickRecordingMime(() => false)).toBeNull();
    expect(pickRecordingMime(() => {
      throw new Error("engine quirk");
    })).toBeNull();
  });
  it("validates uploaded audio", () => {
    expect(precheckAudio({ name: "a.m4a", type: "audio/mp4", size: 1000 })).toBeNull();
    expect(precheckAudio({ name: "a.m4a", type: "audio/mp4", size: 0 })).toMatch(/empty/);
    expect(precheckAudio({ name: "a.mov", type: "video/quicktime", size: 1000 })).toMatch(/isn't audio/);
  });
});
