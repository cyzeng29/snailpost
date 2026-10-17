// POST /api/links/revoke — the owner disables a shared link.
// STATUS: BLOCKED until a Supabase project is configured.
import { revoke, serverConfigured, userFromBearer } from "@/lib/publish/server";

export async function POST(request: Request) {
  if (!serverConfigured()) return Response.json({ error: "not-configured" }, { status: 503 });
  const user = await userFromBearer(request.headers.get("authorization"));
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { clientSnapshotId?: unknown };
  if (typeof body.clientSnapshotId !== "string") return Response.json({ error: "bad-request" }, { status: 400 });
  const ok = await revoke(user.id, body.clientSnapshotId);
  return Response.json({ ok }, { status: ok ? 200 : 404, headers: { "cache-control": "no-store" } });
}
