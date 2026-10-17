"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/components/AppearanceProvider";
import { CreatorShell } from "@/components/creator/CreatorShell";
import { ReadingSetupFields } from "@/components/creator/ReadingSetupFields";
import { Steps } from "@/components/creator/Steps";
import { FlipCard, type Face } from "@/components/postcard/FlipCard";
import { LetterView } from "@/components/postcard/LetterView";
import { PostcardBack, PostcardFront } from "@/components/postcard/PostcardFaces";
import { PrintButton } from "@/components/print/PrintButton";
import { SimpleReader } from "@/components/recipient/SimpleReader";
import { ShareActions } from "@/components/share/ShareActions";
import { readiness, type PostcardContent, type Snapshot } from "@/lib/model";
import { publishingConfigured, publishSnapshot } from "@/lib/publish/client";
import { createSnapshot, getSnapshot, resolveContent, updateSnapshot } from "@/lib/store/local";
import { useDraft } from "@/lib/useDraft";
import { useDraftContent } from "@/lib/useDraftContent";

type ShareState =
  | { s: "idle" }
  | { s: "freezing" }
  | { s: "ready"; snap: Snapshot; content: PostcardContent }
  | { s: "publishing"; snap: Snapshot; content: PostcardContent }
  | { s: "published"; snap: Snapshot; content: PostcardContent }
  | { s: "failed"; snap: Snapshot; content: PostcardContent; message: string };

export function PreviewClient() {
  const { id } = useParams<{ id: string }>();
  const { draft, load, update } = useDraft(id);
  const content = useDraftContent(draft);
  const { prefs } = useAppearance();
  const [face, setFace] = useState<Face>("front");
  const [mode, setMode] = useState<"card" | "letter" | "pages">("card");
  const [share, setShare] = useState<ShareState>({ s: "idle" });
  const [freezeError, setFreezeError] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);
  const shareHeading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);

  useEffect(() => () => releaseRef.current?.(), []);

  // if this draft was already made ready, reopen that frozen version
  useEffect(() => {
    if (!draft?.lastSnapshotId || share.s !== "idle") return;
    let alive = true;
    (async () => {
      const snap = await getSnapshot(draft.lastSnapshotId!);
      if (!alive || !snap) return;
      const { content: c, release } = await resolveContent({ kind: "snapshot", snapshot: snap });
      releaseRef.current?.();
      releaseRef.current = release;
      setShare(snap.share?.state === "active" ? { s: "published", snap, content: c } : { s: "ready", snap, content: c });
    })();
    return () => {
      alive = false;
    };
  }, [draft?.lastSnapshotId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (load === "loading") return <CreatorShell><p role="status">Opening your postcard…</p></CreatorShell>;
  if (!draft || !content)
    return (
      <CreatorShell>
        <h1 className="display text-[1.8rem]">This postcard isn&apos;t on this device.</h1>
        <Link className="btn btn-primary mt-4" href="/today">Go to Today</Link>
      </CreatorShell>
    );

  const problems = readiness(draft);
  const reading = draft.reading ?? prefs.sendDefaults;
  // a changed reading setup counts too: it shows up here before the draft's save time does
  const snapStale =
    "snap" in share &&
    (new Date(draft.updatedAt) > new Date(share.snap.createdAt) || JSON.stringify(share.snap.content.reading) !== JSON.stringify(reading));
  const who = draft.recipient.name.trim() || "they";

  /** Freeze exactly what was reviewed. Guarded so a double tap makes one version. */
  const getReady = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setShare({ s: "freezing" });
    setFreezeError(false);
    try {
      // the ready version carries the reading setup the sender saw here
      const snap = await createSnapshot({ ...draft, reading });
      const { content: c, release } = await resolveContent({ kind: "snapshot", snapshot: snap });
      releaseRef.current?.();
      releaseRef.current = release;
      setShare({ s: "ready", snap, content: c });
      requestAnimationFrame(() => shareHeading.current?.focus());
    } catch {
      setShare({ s: "idle" });
      setFreezeError(true);
    } finally {
      inFlight.current = false;
    }
  };

  const publish = async () => {
    if (!("snap" in share) || inFlight.current) return;
    inFlight.current = true;
    const { snap, content: c } = share;
    setShare({ s: "publishing", snap, content: c });
    const res = await publishSnapshot(snap);
    if (res.ok) {
      const next: Snapshot = { ...snap, share: { url: res.url, state: "active", publishedAt: res.publishedAt } };
      await updateSnapshot(next);
      setShare({ s: "published", snap: next, content: c });
    } else {
      setShare({ s: "failed", snap, content: c, message: res.message });
    }
    inFlight.current = false;
  };

  return (
    <CreatorShell wide>
      <Steps current="preview" draftId={draft.id} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section aria-labelledby="h-preview" className="min-w-0">
          <h1 id="h-preview" className="display m-0 text-[2rem] font-[600]">
            Preview
          </h1>
          <p className="mt-1 text-text-soft">This is what {draft.recipient.name.trim() || "they"} will see.</p>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="How to view it">
            <button type="button" className={`btn ${mode === "card" ? "btn-primary" : "btn-secondary"}`} aria-pressed={mode === "card"} onClick={() => setMode("card")}>
              Postcard
            </button>
            <button type="button" className={`btn ${mode === "letter" ? "btn-primary" : "btn-secondary"}`} aria-pressed={mode === "letter"} onClick={() => setMode("letter")}>
              Read as a letter
            </button>
            <button type="button" className={`btn ${mode === "pages" ? "btn-primary" : "btn-secondary"}`} aria-pressed={mode === "pages"} onClick={() => setMode("pages")}>
              One page at a time
            </button>
          </div>

          <div className="mt-6">
            {mode === "pages" ? (
              <SimpleReader content={{ ...content, reading }} showVoiceWords={reading.showVoiceWords} />
            ) : mode === "card" ? (
              <FlipCard className="mx-auto max-w-[44rem]" face={face} onFaceChange={setFace} label="Your postcard" front={<PostcardFront content={content} />} back={<PostcardBack content={content} />} />
            ) : (
              <LetterView content={content} />
            )}
          </div>
        </section>

        <aside aria-label="Ready to share" className="min-w-0 space-y-5">
          <details className="rounded-[16px] border border-line bg-surface-raised p-5" data-testid="reading-setup">
            <summary className="cursor-pointer">
              <span className="display text-[1.25rem] font-[600]">How it opens for {who}</span>
              <span className="mt-1 block text-[0.95rem] text-text-soft">
                {reading.view === "simple" ? "One page at a time" : "Everything on one page"}, {reading.textSize === "normal" ? "regular" : reading.textSize} text
                {draft.voice ? (reading.playVoiceOnOpen ? ", voice starts on open" : ", voice plays when tapped") : ""}
              </span>
            </summary>
            <div className="mt-4">
              <ReadingSetupFields value={reading} onChange={(r) => void update((d) => ({ ...d, reading: r }))} who={who} />
            </div>
          </details>
          {share.s === "idle" || share.s === "freezing" ? (
            <div className="rounded-[16px] border border-line bg-surface-raised p-5">
              <h2 className="display m-0 text-[1.4rem] font-[600]">Happy with it?</h2>
              {problems.length > 0 ? (
                <ul className="mt-2 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
              ) : (
                <p className="mt-2 text-text-soft">Getting it ready saves this exact version. Later edits won&apos;t change it unless you get it ready again.</p>
              )}
              {freezeError && (
                <p role="alert" className="m-0 mt-3">
                  Couldn&apos;t save this version on this device. Your postcard is still here; please try again.
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" className="btn btn-primary" onClick={getReady} disabled={problems.length > 0 || share.s === "freezing"} aria-busy={share.s === "freezing"}>
                  {share.s === "freezing" ? "Getting it ready…" : "Ready to share"}
                </button>
                <Link href={`/postcards/${draft.id}/edit#note`} className="btn btn-secondary">
                  Keep editing
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-line bg-surface-raised p-5">
              <h2 ref={shareHeading} tabIndex={-1} className="display m-0 text-[1.4rem] font-[600] outline-none">
                A little of your day, ready to go.
              </h2>
              <p className="mt-1 text-[0.92rem] text-text-soft">Version {share.snap.version}, saved {new Date(share.snap.createdAt).toLocaleString()}.</p>

              {snapStale && (
                <div className="mt-3 rounded-[10px] bg-butter/70 p-3">
                  <p className="m-0">You&apos;ve changed the postcard since this version. The ready version hasn&apos;t changed.</p>
                  <button type="button" className="btn btn-secondary mt-2" onClick={getReady}>
                    Get the new version ready
                  </button>
                </div>
              )}

              <h3 className="mt-5 text-[1.05rem] font-bold">Send a link</h3>
              <p className="m-0 text-text-soft">For the photos, note and voice. They open it in any browser, no app or sign-up.</p>
              <div className="mt-3">
                {share.s === "published" && share.snap.share ? (
                  <>
                    <ShareActions url={share.snap.share.url} title={share.content.title || "A postcard"} text={`A little of my day, for you.`} />
                    <p className="m-0 mt-2 text-[0.92rem] text-text-soft">Anyone with this link can open your postcard. You can turn it off in Keepsakes.</p>
                  </>
                ) : publishingConfigured() ? (
                  <>
                    <button type="button" className="btn btn-primary w-full" onClick={publish} disabled={share.s === "publishing"} aria-busy={share.s === "publishing"}>
                      {share.s === "publishing" ? "Uploading your postcard…" : "Make a link"}
                    </button>
                    <p className="m-0 mt-2 text-[0.92rem] text-text-soft">Anyone with this link can open your postcard.</p>
                    {share.s === "failed" && (
                      <p role="alert" className="m-0 mt-2">
                        {share.message}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="m-0 rounded-[10px] border-2 border-dashed border-ink/30 p-3" data-testid="links-unavailable">
                    Sending links isn&apos;t switched on in this version of Snailpost yet, so this postcard is saved on this device only. You can
                    print it below, or open it any time from Keepsakes.
                  </p>
                )}
              </div>

              <h3 className="mt-6 text-[1.05rem] font-bold">Print a keepsake</h3>
              <p className="m-0 mb-3 text-text-soft">A physical card for the fridge or a keepsake box.</p>
              <PrintButton content={share.content} shareUrl={share.snap.share?.state === "active" ? share.snap.share.url : undefined} />

              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
                <Link href="/keepsakes" className="btn btn-quiet">
                  See it in Keepsakes
                </Link>
                <Link href={`/postcards/${draft.id}/edit#note`} className="btn btn-quiet">
                  Keep editing
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </CreatorShell>
  );
}
