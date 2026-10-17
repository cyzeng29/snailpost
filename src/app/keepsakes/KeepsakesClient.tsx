"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CreatorShell } from "@/components/creator/CreatorShell";
import { PostcardCluster, type ClusterItem } from "@/components/keepsakes/PostcardCluster";
import { PrintButton } from "@/components/print/PrintButton";
import { ShareActions } from "@/components/share/ShareActions";
import { formatDay, type Draft, type Snapshot } from "@/lib/model";
import { revokeLink } from "@/lib/publish/client";
import { SAMPLE_POSTCARD } from "@/lib/sample";
import { deleteDraft, deleteSnapshot, listDrafts, listSnapshots, resolveContent, updateSnapshot } from "@/lib/store/local";

type Keepsake = ClusterItem & {
  kind: "sample" | "draft" | "ready";
  draft?: Draft;
  snapshot?: Snapshot;
  recipient: string;
  month: string;
};

const VIEW_KEY = "snailpost.keepsakes.view";

function monthOf(day: string) {
  const [y, m] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
}

export function KeepsakesClient() {
  const [items, setItems] = useState<Keepsake[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"pile" | "list">("pile");
  const [confirm, setConfirm] = useState<{ kind: "delete" | "revoke"; item: Keepsake } | null>(null);
  const [notice, setNotice] = useState("");
  const releases = useRef<(() => void)[]>([]);

  const load = useCallback(async () => {
    try {
      const [drafts, snaps] = await Promise.all([listDrafts(), listSnapshots()]);
      releases.current.forEach((r) => r());
      releases.current = [];
      const latestSnap = new Map<string, Snapshot>();
      for (const s of snaps) if (!latestSnap.has(s.draftId) || latestSnap.get(s.draftId)!.version < s.version) latestSnap.set(s.draftId, s);

      const out: Keepsake[] = [];
      for (const d of drafts) {
        const snap = latestSnap.get(d.id);
        if (!snap && d.moments.length === 0) continue; // nothing to keep yet
        const src = snap ? ({ kind: "snapshot", snapshot: snap } as const) : ({ kind: "draft", draft: d } as const);
        const { content, release } = await resolveContent(src);
        releases.current.push(release);
        const link = snap?.share;
        out.push({
          key: snap ? snap.id : d.id,
          kind: snap ? "ready" : "draft",
          draft: d,
          snapshot: snap,
          content,
          title: content.title.trim() || "Untitled postcard",
          dateLabel: formatDay(content.day),
          statusLabel: !snap ? "Draft" : link?.state === "active" ? "Link on" : link?.state === "revoked" ? "Link turned off" : "Ready, on this device",
          recipient: content.recipientName.trim() || "Someone",
          month: monthOf(content.day),
        });
      }
      out.push({
        key: SAMPLE_POSTCARD.id,
        kind: "sample",
        content: SAMPLE_POSTCARD,
        title: SAMPLE_POSTCARD.title,
        dateLabel: formatDay(SAMPLE_POSTCARD.day),
        statusLabel: "Sample",
        recipient: SAMPLE_POSTCARD.recipientName,
        month: monthOf(SAMPLE_POSTCARD.day),
      });
      out.sort((a, b) => b.content.day.localeCompare(a.content.day));
      setItems(out);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- load from IndexedDB on mount
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "pile") setView(v);
    } catch {
      /* default view */
    }
    const r = releases.current;
    return () => r.forEach((fn) => fn());
  }, [load]);

  const chooseView = (v: "pile" | "list") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* fine */
    }
  };

  const groups = useMemo(() => {
    const m = new Map<string, Keepsake[]>();
    for (const it of items ?? []) m.set(it.month, [...(m.get(it.month) ?? []), it]);
    return [...m.entries()];
  }, [items]);

  const doConfirm = async () => {
    if (!confirm) return;
    const { kind, item } = confirm;
    if (kind === "delete") {
      if (item.snapshot) await deleteSnapshot(item.snapshot.id);
      if (item.draft) await deleteDraft(item.draft.id);
      setNotice(`Deleted “${item.title}” from this device.`);
    } else if (item.snapshot?.share) {
      const ok = await revokeLink(item.snapshot);
      if (ok) {
        await updateSnapshot({ ...item.snapshot, share: { ...item.snapshot.share, state: "revoked" } });
        setNotice("The link is turned off. People who open it will see that the postcard is no longer available.");
      } else setNotice("The link couldn't be turned off just now. Please try again.");
    }
    setConfirm(null);
    await load();
  };

  const actions = (it: ClusterItem) => <KeepsakeActions item={it as Keepsake} onConfirm={(kind, item) => setConfirm({ kind, item })} />;

  return (
    <CreatorShell wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display m-0 text-[2rem] font-[600]">Keepsakes</h1>
          <p className="m-0 mt-1 text-text-soft">A small box of days, kept on this device.</p>
        </div>
        <div role="group" aria-label="Layout" className="flex gap-1 rounded-full border border-line p-1">
          {(["pile", "list"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)} className={`btn min-h-[40px] px-4 ${view === v ? "bg-ink text-paper" : ""}`}>
              {v === "pile" ? "Pile" : "List"}
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="m-0 mt-3 min-h-[1.5rem]">
        {notice}
      </p>

      {failed && <p role="alert">Your keepsakes couldn&apos;t be opened in this browser. Private browsing can block saving.</p>}
      {!items && !failed && <p role="status">Opening your keepsake box…</p>}

      {items &&
        groups.map(([month, group]) => (
          <section key={month} className="mt-8" aria-labelledby={`m-${month}`}>
            <h2 id={`m-${month}`} className="m-0 mb-4 text-[1.1rem] font-bold uppercase tracking-[0.08em] text-text-soft">
              {month}
            </h2>
            {view === "pile" ? (
              <PostcardCluster items={group} groupLabel={`Postcards from ${month}`} renderActions={actions} />
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0">
                {group.map((it) => (
                  <li key={it.key} className="rounded-[12px] border border-line bg-surface-raised p-4">
                    <div className="flex flex-wrap items-start gap-4">
                      {it.content.moments[0] && (
                        // eslint-disable-next-line @next/next/no-img-element -- local/static image
                        <img src={it.content.moments[0].src} alt="" className="aspect-[4/3] w-24 rounded-[6px] object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 text-[1.1rem] font-bold">{it.title}</h3>
                        <p className="m-0 text-text-soft">
                          {it.dateLabel} · for {it.recipient} · <StatusTag item={it} />
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <KeepsakeActions item={it} onConfirm={(kind, item) => setConfirm({ kind, item })} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

      {items && items.length === 1 && (
        <p className="mt-10 text-center text-text-soft">
          Your postcards will gather here. <Link href="/today" className="font-bold underline">Start today&apos;s</Link>.
        </p>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === "revoke" ? "Turn off this link?" : "Delete this postcard?"}
        body={
          confirm?.kind === "revoke"
            ? "Anyone who opens the link will see that the postcard is no longer available. Photos already open on someone's screen may stay visible for up to an hour."
            : confirm?.item.snapshot?.share?.state === "active"
              ? "This removes it from this device. The shared link stays on until you turn it off, so turn the link off first if you want it gone."
              : "This removes the postcard and its photos from this device. It can't be undone."
        }
        confirmLabel={confirm?.kind === "revoke" ? "Turn off link" : "Delete"}
        onConfirm={() => void doConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </CreatorShell>
  );
}

function StatusTag({ item }: { item: Keepsake }) {
  const style =
    item.kind === "draft" ? "border-dashed border-ink/50" : item.kind === "sample" ? "border-postal/60" : "border-moss/60";
  return <span className={`inline-block rounded-full border-2 px-2 text-[0.85rem] font-bold text-ink ${style}`}>{item.statusLabel}</span>;
}

function KeepsakeActions({ item, onConfirm }: { item: Keepsake; onConfirm: (k: "delete" | "revoke", item: Keepsake) => void }) {
  const [sharing, setSharing] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []); // eslint-disable-line react-hooks/set-state-in-effect
  const link = item.snapshot?.share;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {item.kind === "sample" ? (
          <Link className="btn btn-secondary" href="/demo">
            Open as they&apos;d see it
          </Link>
        ) : (
          <Link className="btn btn-secondary" href={item.kind === "draft" ? `/postcards/${item.draft!.id}/edit` : `/postcards/${item.draft!.id}/preview`}>
            {item.kind === "draft" ? "Keep editing" : "Reopen"}
          </Link>
        )}
        {(item.kind === "sample" || link?.state === "active") && (
          <button type="button" className="btn btn-secondary" aria-expanded={sharing} onClick={() => setSharing((s) => !s)}>
            {item.kind === "sample" ? "Share the sample link" : "Share again"}
          </button>
        )}
        {link?.state === "active" && (
          <button type="button" className="btn btn-quiet" onClick={() => onConfirm("revoke", item)}>
            Turn off link
          </button>
        )}
        {item.kind !== "sample" && (
          <button type="button" className="btn btn-quiet" onClick={() => onConfirm("delete", item)}>
            Delete
          </button>
        )}
      </div>
      {sharing && origin && (
        <div className="mt-3 rounded-[12px] border border-line p-3">
          <ShareActions url={item.kind === "sample" ? `${origin}/demo` : link!.url} title={item.title} />
        </div>
      )}
      <div className="mt-3">
        <PrintButton content={item.content} shareUrl={link?.state === "active" ? link.url : undefined} label="Download printable PDF" />
      </div>
    </div>
  );
}
