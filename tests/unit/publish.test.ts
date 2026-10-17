import { describe, expect, it } from "vitest";
import { hashToken, isWellFormedToken, newShareToken } from "@/lib/publish/server";
import { validatePublishedContent } from "@/lib/publish/validate";
import { isPrintableShareUrl } from "@/lib/pdf";

const OWNER = "11111111-2222-3333-4444-555555555555";
const SNAP = "s_0123456789abcdef0123";
const good = () => ({
  title: "Four little things from Thursday",
  note: "Nothing big happened today.",
  senderName: "Alex",
  recipientName: "Grandma",
  day: "2026-10-15",
  timeZone: "America/New_York",
  stamp: "breakfast-club",
  moments: [{ id: "m1", caption: "Eggs", capturedAt: "2026-10-15T08:12:00-04:00", width: 1600, height: 1200, path: `${OWNER}/${SNAP}/photo-1.jpg` }],
  voice: { path: `${OWNER}/${SNAP}/voice.m4a`, mimeType: "audio/mp4", durationSec: 16 },
  written: { kind: "summary", text: "Breakfast and a walk." },
});

describe("share tokens", () => {
  it("are 256-bit, URL-safe and never sequential", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
  });
  it("are stored only as a SHA-256 hash", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).not.toContain("abc");
  });
  it("reject malformed tokens before any lookup", () => {
    expect(isWellFormedToken("1")).toBe(false);
    expect(isWellFormedToken("../../etc/passwd")).toBe(false);
  });
});

describe("server-side content validation", () => {
  it("accepts a well-formed snapshot", () => {
    const c = validatePublishedContent(good(), OWNER, SNAP);
    expect(c.moments[0].path).toContain(OWNER);
    expect(c.voice?.durationSec).toBe(16);
  });
  it("rejects media outside the sender's own folder", () => {
    const c = good();
    c.moments[0].path = `someone-else/${SNAP}/photo-1.jpg`;
    expect(() => validatePublishedContent(c, OWNER, SNAP)).toThrow(/not owned/);
    const d = good();
    d.moments[0].path = `${OWNER}/${SNAP}/../../x.jpg`;
    expect(() => validatePublishedContent(d, OWNER, SNAP)).toThrow(/not owned/);
  });
  it("enforces limits the client also enforces", () => {
    const c = good();
    c.note = "x".repeat(281);
    expect(() => validatePublishedContent(c, OWNER, SNAP)).toThrow(/too long/);
    const d = good() as Record<string, unknown>;
    d.moments = [];
    expect(() => validatePublishedContent(d, OWNER, SNAP)).toThrow(/moments/);
    const e = good();
    e.voice.durationSec = 300;
    expect(() => validatePublishedContent(e, OWNER, SNAP)).toThrow(/duration/);
    const f = good();
    f.stamp = "gold-star";
    expect(() => validatePublishedContent(f, OWNER, SNAP)).toThrow(/stamp/);
  });
});

describe("printable QR links", () => {
  it("only allows real public https URLs", () => {
    expect(isPrintableShareUrl("https://snailpost.vercel.app/p/abc")).toBe(true);
    expect(isPrintableShareUrl("http://snailpost.vercel.app/p/abc")).toBe(false);
    expect(isPrintableShareUrl("https://localhost:3000/p/abc")).toBe(false);
    expect(isPrintableShareUrl("blob:https://x/123")).toBe(false);
    expect(isPrintableShareUrl(undefined)).toBe(false);
  });
});
