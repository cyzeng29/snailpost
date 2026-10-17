// Publishing boundary. A durable, cross-device link needs real server-side
// storage. Until it's configured, the app says so plainly and never invents a
// share URL for a personal card.
import type { Snapshot } from "../model";

export function publishingConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export type PublishResult = { ok: true; url: string; publishedAt: string } | { ok: false; reason: "not-configured" | "offline" | "failed"; message: string };

/**
 * Publish a frozen snapshot. Idempotent: the snapshot id is the idempotency
 * key, so a double tap or retry returns the same link instead of a duplicate.
 */
export async function publishSnapshot(snapshot: Snapshot): Promise<PublishResult> {
  if (!publishingConfigured()) {
    return { ok: false, reason: "not-configured", message: "Sending links isn't switched on in this version yet." };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline", message: "You're offline. Your postcard is safe; try again when you're connected." };
  }
  const { publishWithSupabase } = await import("./supabase");
  return publishWithSupabase(snapshot);
}

export async function revokeLink(snapshot: Snapshot): Promise<boolean> {
  if (!publishingConfigured() || !snapshot.share) return false;
  const { revokeWithSupabase } = await import("./supabase");
  return revokeWithSupabase(snapshot);
}
