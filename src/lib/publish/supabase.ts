// Browser side of publishing with Supabase. STATUS: written, NOT YET RUN
// against a real project (no credentials yet). See docs/supabase-setup.md.
//
// Flow: anonymous sender session → upload media to a private bucket under the
// sender's own folder → POST /api/publish with the session token. The server
// verifies ownership, stores an immutable snapshot, and returns a link whose
// token is high-entropy and stored only as a hash.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Snapshot } from "../model";
import { getBlob } from "../store/local";
import type { PublishResult } from "./client";

export const MEDIA_BUCKET = "postcard-media";

let client: SupabaseClient | null = null;
export function supabaseBrowser() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

/** Minimal sender identity: an anonymous account, upgradable later. */
async function senderSession() {
  const sb = supabaseBrowser();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error || !signed.session) throw new Error("auth");
  return signed.session;
}

const ext = (type: string) => (type.includes("png") ? "png" : type.includes("jpeg") ? "jpg" : type.includes("mp4") ? "m4a" : type.includes("webm") ? "webm" : type.includes("ogg") ? "ogg" : "bin");

export async function publishWithSupabase(snapshot: Snapshot): Promise<PublishResult> {
  try {
    const session = await senderSession();
    const sb = supabaseBrowser();
    const uid = session.user.id;
    const prefix = `${uid}/${snapshot.id}`;

    const upload = async (blobId: string, name: string) => {
      const blob = await getBlob(blobId);
      if (!blob) throw new Error("missing-media");
      const path = `${prefix}/${name}.${ext(blob.type)}`;
      // upsert: a retry after a partial failure overwrites, never duplicates
      const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: blob.type, upsert: true });
      if (error) throw error;
      return path;
    };

    const c = snapshot.content;
    const moments = [];
    for (let i = 0; i < c.moments.length; i++) {
      const { photoId, ...m } = c.moments[i];
      moments.push({ ...m, path: await upload(photoId, `photo-${i + 1}`) });
    }
    const voice = c.voice ? { mimeType: c.voice.mimeType, durationSec: c.voice.durationSec, path: await upload(c.voice.blobId, "voice") } : undefined;

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ clientSnapshotId: snapshot.id, version: snapshot.version, content: { ...c, moments, voice } }),
    });
    if (!res.ok) return { ok: false, reason: "failed", message: "The postcard couldn't be sent just now. It's still saved here; try again." };
    const body = (await res.json()) as { url: string; publishedAt: string };
    return { ok: true, url: body.url, publishedAt: body.publishedAt };
  } catch {
    return { ok: false, reason: "failed", message: "The postcard couldn't be sent just now. It's still saved here; try again." };
  }
}

export async function revokeWithSupabase(snapshot: Snapshot): Promise<boolean> {
  try {
    const session = await senderSession();
    const res = await fetch("/api/links/revoke", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ clientSnapshotId: snapshot.id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
