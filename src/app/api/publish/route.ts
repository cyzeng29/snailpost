// POST /api/publish — store an immutable postcard snapshot and mint its link.
// STATUS: BLOCKED until a Supabase project is configured (see docs/supabase-setup.md).
import { publish, serverConfigured, userFromBearer } from "@/lib/publish/server";

export async function POST(request: Request) {
  if (!serverConfigured()) return Response.json({ error: "not-configured" }, { status: 503 });
  const user = await userFromBearer(request.headers.get("authorization"));
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { clientSnapshotId?: unknown; version?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (typeof body.clientSnapshotId !== "string" || !/^s_[0-9a-f]{20}$/.test(body.clientSnapshotId) || typeof body.version !== "number") {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  try {
    const origin = process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const result = await publish(user.id, body.clientSnapshotId, body.version, body.content, origin);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    // no tokens or personal content in logs
    console.error("publish failed");
    return Response.json({ error: "publish-failed" }, { status: 422 });
  }
}
