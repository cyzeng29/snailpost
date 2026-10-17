import "server-only";
// Server side of publishing. Service-role credentials never leave the server.
// STATUS: written, NOT YET RUN against a real project (no credentials yet).
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { PostcardContent } from "../model";
import { validatePublishedContent, type StoredContent } from "./validate";

export const MEDIA_BUCKET = "postcard-media";
/** Signed media URLs expire; revocation takes full effect within this window. */
export const SIGNED_URL_SECONDS = 60 * 60;

export function serverConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 256-bit, URL-safe bearer token. Only its SHA-256 hash is stored. */
export function newShareToken() {
  return randomBytes(32).toString("base64url");
}
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function isWellFormedToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function userFromBearer(authorization: string | null) {
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Store an immutable snapshot and its link. Idempotent on (owner, clientSnapshotId):
 * a retry returns the existing link rather than creating a second card.
 */
export async function publish(ownerId: string, clientSnapshotId: string, version: number, raw: unknown, origin: string) {
  const content = validatePublishedContent(raw, ownerId, clientSnapshotId);
  const db = admin();

  // confirm every referenced object exists in the owner's folder
  const { data: listed, error: listErr } = await db.storage.from(MEDIA_BUCKET).list(`${ownerId}/${clientSnapshotId}`);
  if (listErr) throw listErr;
  const present = new Set((listed ?? []).map((o) => `${ownerId}/${clientSnapshotId}/${o.name}`));
  for (const p of [...content.moments.map((m) => m.path), ...(content.voice ? [content.voice.path] : [])]) {
    if (!present.has(p)) throw new Error("missing media");
  }

  const existing = await db
    .from("postcards")
    .select("id, created_at, share_links(token_hash, revoked_at)")
    .eq("owner_id", ownerId)
    .eq("client_snapshot_id", clientSnapshotId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  // A token is shown once. On an idempotent retry we mint a fresh token for the
  // same card and retire the previous one, so a single active link remains.
  const token = newShareToken();
  let postcardId = existing.data?.id as string | undefined;
  let publishedAt = existing.data?.created_at as string | undefined;
  if (!postcardId) {
    const ins = await db
      .from("postcards")
      .insert({ owner_id: ownerId, client_snapshot_id: clientSnapshotId, version, content })
      .select("id, created_at")
      .single();
    if (ins.error) {
      // unique violation from a concurrent double-submit: read the winner
      const again = await db.from("postcards").select("id, created_at").eq("owner_id", ownerId).eq("client_snapshot_id", clientSnapshotId).single();
      if (again.error) throw ins.error;
      postcardId = again.data.id;
      publishedAt = again.data.created_at;
    } else {
      postcardId = ins.data.id;
      publishedAt = ins.data.created_at;
    }
  }
  await db.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("postcard_id", postcardId).is("revoked_at", null);
  const link = await db.from("share_links").insert({ postcard_id: postcardId, token_hash: hashToken(token) });
  if (link.error) throw link.error;
  return { url: `${origin}/p/${token}`, publishedAt: publishedAt! };
}

export async function revoke(ownerId: string, clientSnapshotId: string) {
  const db = admin();
  const card = await db.from("postcards").select("id").eq("owner_id", ownerId).eq("client_snapshot_id", clientSnapshotId).maybeSingle();
  if (card.error || !card.data) return false;
  const res = await db.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("postcard_id", card.data.id).is("revoked_at", null);
  return !res.error;
}

/** Resolve a bearer token to renderable content with short-lived signed media URLs. */
export async function readShared(token: string): Promise<PostcardContent | null> {
  if (!isWellFormedToken(token)) return null;
  const db = admin();
  const link = await db
    .from("share_links")
    .select("revoked_at, postcards(id, content, active)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (link.error || !link.data || link.data.revoked_at) return null;
  const card = link.data.postcards as unknown as { id: string; content: StoredContent; active: boolean } | null;
  if (!card || !card.active) return null;
  const c = card.content;
  const paths = [...c.moments.map((m) => m.path), ...(c.voice ? [c.voice.path] : [])];
  const signed = await db.storage.from(MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (signed.error) return null;
  const url = new Map(signed.data.map((s) => [s.path, s.signedUrl]));
  return {
    ...c,
    id: card.id,
    moments: c.moments.map(({ path, ...m }) => ({ ...m, src: url.get(path) ?? "" })),
    voice: c.voice ? { src: url.get(c.voice.path) ?? "", mimeType: c.voice.mimeType, durationSec: c.voice.durationSec } : undefined,
  };
}
