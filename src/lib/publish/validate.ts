// Server-side validation of published content. Never trust the client: limits,
// types and media ownership are all re-checked here. Pure, so it is unit-tested.
import { STAMPS } from "../brand";
import { MAX_MOMENTS, NOTE_LIMIT, TITLE_LIMIT, type PostcardContent } from "../model";

export type StoredContent = Omit<PostcardContent, "moments" | "voice" | "isSample" | "sampleNotice"> & {
  moments: (Omit<PostcardContent["moments"][number], "src"> & { path: string })[];
  voice?: { path: string; mimeType: string; durationSec: number };
};

const str = (v: unknown, max: number, field: string, optional = false): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (optional) return undefined;
    if (v === "") return "";
  }
  if (typeof v !== "string") throw new Error(`invalid ${field}`);
  if (v.length > max) throw new Error(`${field} too long`);
  return v;
};

const IMAGE_EXT = /\.(jpg|png)$/;
const AUDIO_EXT = /\.(m4a|webm|ogg)$/;
const AUDIO_TYPES = ["audio/mp4", "audio/webm", "audio/ogg", "audio/mpeg", "audio/aac", "audio/x-m4a", "audio/wav"];

export function validatePublishedContent(raw: unknown, ownerId: string, snapshotId: string): StoredContent {
  if (!raw || typeof raw !== "object") throw new Error("invalid content");
  const c = raw as Record<string, unknown>;
  const prefix = `${ownerId}/${snapshotId}/`;
  const ownPath = (p: unknown, re: RegExp) => {
    if (typeof p !== "string" || !p.startsWith(prefix) || p.includes("..") || !re.test(p)) throw new Error("media not owned");
    return p;
  };
  if (!Array.isArray(c.moments) || c.moments.length < 1 || c.moments.length > MAX_MOMENTS) throw new Error("invalid moments");
  const stamp = c.stamp as string;
  if (!STAMPS.some((s) => s.id === stamp)) throw new Error("invalid stamp");
  if (typeof c.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.day)) throw new Error("invalid day");

  const moments = c.moments.map((m: Record<string, unknown>) => {
    if (typeof m.width !== "number" || typeof m.height !== "number" || m.width <= 0 || m.height <= 0 || m.width > 10000 || m.height > 10000)
      throw new Error("invalid dimensions");
    return {
      id: str(m.id, 40, "moment id")!,
      caption: str(m.caption, 200, "caption") ?? "",
      capturedAt: str(m.capturedAt, 40, "capturedAt")!,
      width: m.width,
      height: m.height,
      path: ownPath(m.path, IMAGE_EXT),
    };
  });

  let voice: StoredContent["voice"];
  if (c.voice) {
    const v = c.voice as Record<string, unknown>;
    if (typeof v.durationSec !== "number" || v.durationSec <= 0 || v.durationSec > 61) throw new Error("invalid voice duration");
    if (typeof v.mimeType !== "string" || !AUDIO_TYPES.includes(v.mimeType)) throw new Error("invalid voice type");
    voice = { path: ownPath(v.path, AUDIO_EXT), mimeType: v.mimeType, durationSec: v.durationSec };
  }

  let written: StoredContent["written"];
  if (c.written) {
    const w = c.written as Record<string, unknown>;
    if (w.kind !== "transcript" && w.kind !== "summary") throw new Error("invalid written kind");
    written = { kind: w.kind, text: str(w.text, 1200, "written")! };
  }

  return {
    id: snapshotId,
    title: str(c.title, TITLE_LIMIT, "title") ?? "",
    note: str(c.note, NOTE_LIMIT, "note") ?? "",
    senderName: str(c.senderName, 40, "senderName") ?? "",
    recipientName: str(c.recipientName, 40, "recipientName") ?? "",
    fromPlace: str(c.fromPlace, 30, "fromPlace", true),
    toPlace: str(c.toPlace, 30, "toPlace", true),
    day: c.day,
    timeZone: str(c.timeZone, 64, "timeZone")!,
    stamp: stamp as StoredContent["stamp"],
    moments,
    voice,
    written,
  };
}
