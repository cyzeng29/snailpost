// One postcard content model, shared by the creator, the card faces, the
// recipient page, the letter view and the PDF export, so they cannot drift.
import type { StampId } from "./brand";

export const MAX_MOMENTS = 6;
export const NOTE_LIMIT = 280;
export const TITLE_LIMIT = 60;
export const MAX_VOICE_SECONDS = 60;

export interface Recipient {
  /** display name or relationship, e.g. "Grandma" */
  name: string;
  /** optional, manually entered, e.g. "Shanghai" */
  place?: string;
}

/** A moment as stored in a draft. Photos live in IndexedDB under `photoId`. */
export interface Moment {
  id: string;
  photoId: string;
  caption: string;
  /** ISO timestamp with offset, when the moment was added */
  capturedAt: string;
  width: number;
  height: number;
}

export type WrittenKind = "transcript" | "summary";

export interface VoiceNote {
  blobId: string;
  mimeType: string;
  durationSec: number;
  /** "recorded" in the app, or "uploaded" from a file */
  source: "recorded" | "uploaded";
}

export type SaveState = "saving" | "saved" | "failed";

export interface Draft {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** The sender's day, YYYY-MM-DD, in `timeZone`. */
  day: string;
  timeZone: string;
  senderName: string;
  recipient: Recipient;
  fromPlace?: string;
  /** user-defined order is the array order */
  moments: Moment[];
  title: string;
  note: string;
  stamp: StampId;
  voice?: VoiceNote;
  /** Always-readable words for the voice note. Never labelled verbatim unless the sender says so. */
  written?: { kind: WrittenKind; text: string };
  /** id of the latest frozen snapshot made from this draft, if any */
  lastSnapshotId?: string;
}

/**
 * What every renderer consumes. Media are resolved to URLs: blob: URLs for
 * local drafts/snapshots, signed URLs for published cards, or bundled files
 * for the sample.
 */
export interface PostcardContent {
  id: string;
  title: string;
  note: string;
  senderName: string;
  recipientName: string;
  fromPlace?: string;
  toPlace?: string;
  day: string;
  timeZone: string;
  stamp: StampId;
  moments: {
    id: string;
    caption: string;
    capturedAt: string;
    src: string;
    width: number;
    height: number;
  }[];
  voice?: { src: string; mimeType: string; durationSec: number };
  written?: { kind: WrittenKind; text: string };
  /** true for the bundled fictional demo */
  isSample?: boolean;
  sampleNotice?: string;
}

/** A frozen copy of a draft at the moment the sender said it was ready. */
export interface Snapshot {
  id: string;
  draftId: string;
  version: number;
  createdAt: string;
  /** content with media still referenced by blob id (resolved when shown) */
  content: Omit<PostcardContent, "moments" | "voice"> & {
    moments: (Omit<PostcardContent["moments"][number], "src"> & { photoId: string })[];
    voice?: { blobId: string; mimeType: string; durationSec: number };
  };
  /** Present only when a real share link exists. */
  share?: { url: string; state: "active" | "revoked"; publishedAt: string };
}

export function localDay(date: Date, timeZone: string) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function currentTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** ISO string with the local offset, so the sender's wall-clock time survives. */
export function isoWithOffset(date: Date) {
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`
  );
}

/** "8:12 am" from an offset ISO string, shown in the sender's own clock time. */
export function formatMomentTime(iso: string) {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return "";
  const h = Number(m[1]);
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** "Thursday, October 16" from YYYY-MM-DD, independent of the viewer's zone. */
export function formatDay(day: string, opts: { weekday?: boolean; year?: boolean } = {}) {
  const [y, mo, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: opts.weekday === false ? undefined : "long",
    month: "long",
    day: "numeric",
    year: opts.year ? "numeric" : undefined,
  }).format(date);
}

export function weekdayOf(day: string) {
  return formatDay(day, { weekday: true }).split(",")[0];
}

/** Starter title from the sender's own material. Never invents events. */
export function suggestTitle(momentCount: number, day: string) {
  const words = ["One", "Two", "Three", "Four", "Five", "Six"];
  const n = Math.max(1, Math.min(6, momentCount));
  const noun = n === 1 ? "little thing" : "little things";
  return `${words[n - 1]} ${noun} from ${weekdayOf(day)}`;
}

export function newId(prefix = "") {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function emptyDraft(now = new Date()): Draft {
  const timeZone = currentTimeZone();
  return {
    id: newId("d_"),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    day: localDay(now, timeZone),
    timeZone,
    senderName: "",
    recipient: { name: "" },
    moments: [],
    title: "",
    note: "",
    stamp: "breakfast-club",
  };
}

/** Pure reordering helpers used by both tap controls and drag. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function readiness(d: Pick<Draft, "moments" | "note" | "title">) {
  const problems: string[] = [];
  if (d.moments.length === 0) problems.push("Add at least one moment.");
  if (d.note.length > NOTE_LIMIT) problems.push(`Keep the note to ${NOTE_LIMIT} characters.`);
  if (d.title.length > TITLE_LIMIT) problems.push(`Keep the title to ${TITLE_LIMIT} characters.`);
  return problems;
}
