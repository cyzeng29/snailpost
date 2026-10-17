"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AddMomentDialog, type NewMomentInput } from "@/components/creator/AddMomentDialog";
import { CreatorShell } from "@/components/creator/CreatorShell";
import { MomentList } from "@/components/creator/MomentList";
import { SaveStatus } from "@/components/creator/SaveStatus";
import { StampPicker } from "@/components/creator/StampPicker";
import { Steps, type StepKey } from "@/components/creator/Steps";
import { FlipCard, type Face } from "@/components/postcard/FlipCard";
import { PostcardBack, PostcardFront } from "@/components/postcard/PostcardFaces";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { isoWithOffset, MAX_MOMENTS, newId, NOTE_LIMIT, readiness, suggestTitle, TITLE_LIMIT } from "@/lib/model";
import { setCurrentDraft } from "@/lib/store/local";
import { useDraft } from "@/lib/useDraft";
import { useDraftContent } from "@/lib/useDraftContent";

export function EditClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { draft, load, saveState, update, retry, flush } = useDraft(id);
  const content = useDraftContent(draft);
  const [step, setStep] = useState<Exclude<StepKey, "preview">>("moments");
  const [adding, setAdding] = useState(false);
  const [face, setFace] = useState<Face>("front");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ids = { title: useId(), note: useId(), count: useId(), sender: useId(), to: useId(), toPlace: useId(), from: useId() };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#note") setStep("note"); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // this draft becomes the one Today collects into while it's being edited
  useEffect(() => {
    if (draft) void setCurrentDraft(draft.id);
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // a sensible starter title from the sender's own material, never invented
  useEffect(() => {
    if (step === "note" && draft && !draft.title && draft.moments.length) {
      void update((d) => ({ ...d, title: suggestTitle(d.moments.length, d.day) }));
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: Exclude<StepKey, "preview">) => {
    setStep(s);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    });
  };

  if (load === "loading") return <CreatorShell wide><p role="status">Opening your postcard…</p></CreatorShell>;
  if (load === "missing" || !draft)
    return (
      <CreatorShell>
        <h1 className="display text-[1.8rem]">This postcard isn&apos;t on this device.</h1>
        <p>Drafts are saved in the browser where you made them.</p>
        <Link className="btn btn-primary mt-4" href="/today">
          Go to Today
        </Link>
      </CreatorShell>
    );

  const problems = readiness(draft);
  const captionsNote = draft.moments.map((m) => m.caption.trim()).filter(Boolean).join(" ");
  const addMoment = async (m: NewMomentInput) =>
    update(
      (d) => ({ ...d, moments: [...d.moments, { id: newId("m_"), photoId: m.photoId, caption: m.caption, width: m.width, height: m.height, capturedAt: isoWithOffset(new Date()) }] }),
      true,
    );

  const toPreview = async () => {
    await flush();
    router.push(`/postcards/${draft.id}/preview`);
  };

  return (
    <CreatorShell wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Steps current={step} draftId={draft.id} onSelect={(s) => s !== "preview" && go(s)} />
        <SaveStatus state={saveState} onRetry={retry} />
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="min-w-0">
          {step === "moments" ? (
            <section aria-labelledby="h-moments">
              <h1 id="h-moments" ref={headingRef} tabIndex={-1} className="display m-0 text-[2rem] font-[600] outline-none">
                Your moments
              </h1>
              <p className="mt-1 text-text-soft">One is enough. Up to six. Arrange them in the order you want them seen.</p>
              <div className="mt-5">
                {draft.moments.length ? (
                  <MomentList draft={draft} update={update} />
                ) : (
                  <p className="rounded-[12px] border-2 border-dashed border-ink/25 p-6 text-center">A small thing is enough. Add a moment to begin.</p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)} disabled={draft.moments.length >= MAX_MOMENTS}>
                  Add a little moment
                </button>
                <button type="button" className="btn btn-primary" onClick={() => go("note")} disabled={draft.moments.length === 0}>
                  Next: your note
                </button>
              </div>
            </section>
          ) : (
            <section aria-labelledby="h-note">
              <h1 id="h-note" ref={headingRef} tabIndex={-1} className="display m-0 text-[2rem] font-[600] outline-none">
                Your note
              </h1>
              <p className="mt-1 text-text-soft">Short and in your own words. It goes on the back of the card.</p>

              <div className="mt-6 grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={ids.to} className="block font-bold">
                      Dear…
                    </label>
                    <input id={ids.to} className="field mt-1" maxLength={40} value={draft.recipient.name} placeholder="Grandma"
                      onChange={(e) => void update((d) => ({ ...d, recipient: { ...d.recipient, name: e.target.value } }))} />
                  </div>
                  <div>
                    <label htmlFor={ids.sender} className="block font-bold">
                      Love, <span className="font-normal text-text-soft">(your name)</span>
                    </label>
                    <input id={ids.sender} className="field mt-1" maxLength={40} value={draft.senderName} placeholder="Alex" autoComplete="given-name"
                      onChange={(e) => void update((d) => ({ ...d, senderName: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label htmlFor={ids.title} className="block font-bold">
                    Postcard title
                  </label>
                  <input id={ids.title} className="field mt-1" maxLength={TITLE_LIMIT} value={draft.title}
                    onChange={(e) => void update((d) => ({ ...d, title: e.target.value }))} />
                </div>

                <div>
                  <label htmlFor={ids.note} className="block font-bold">
                    Message
                  </label>
                  <textarea
                    id={ids.note}
                    aria-describedby={ids.count}
                    className="field mt-1 min-h-[8rem] resize-y"
                    value={draft.note}
                    placeholder="Nothing big happened today. I just wanted you to be in it."
                    onChange={(e) => void update((d) => ({ ...d, note: e.target.value }))}
                  />
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <p id={ids.count} className={`m-0 text-[0.92rem] ${draft.note.length > NOTE_LIMIT ? "font-bold text-clay-deep" : "text-text-soft"}`}>
                      {draft.note.length} of {NOTE_LIMIT} characters
                      {draft.note.length > NOTE_LIMIT ? ". A little long for the card; trim it, or put the rest in a caption." : ""}
                    </p>
                    {!draft.note.trim() && captionsNote && captionsNote.length <= NOTE_LIMIT && (
                      <button type="button" className="btn btn-quiet" onClick={() => void update((d) => ({ ...d, note: captionsNote }))}>
                        Start from my captions
                      </button>
                    )}
                  </div>
                </div>

                <details className="rounded-[12px] border border-line p-4">
                  <summary className="cursor-pointer font-bold">Add places (optional)</summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={ids.from} className="block font-bold">
                        You&apos;re in
                      </label>
                      <input id={ids.from} className="field mt-1" maxLength={30} value={draft.fromPlace ?? ""} placeholder="Boston"
                        onChange={(e) => void update((d) => ({ ...d, fromPlace: e.target.value || undefined }))} />
                    </div>
                    <div>
                      <label htmlFor={ids.toPlace} className="block font-bold">
                        They&apos;re in
                      </label>
                      <input id={ids.toPlace} className="field mt-1" maxLength={30} value={draft.recipient.place ?? ""} placeholder="Shanghai"
                        onChange={(e) => void update((d) => ({ ...d, recipient: { ...d.recipient, place: e.target.value || undefined } }))} />
                    </div>
                  </div>
                  <p className="m-0 mt-2 text-[0.9rem] text-text-soft">Typed by you. Snailpost never tracks location.</p>
                </details>

                <VoiceRecorder draft={draft} update={update} />

                <StampPicker value={draft.stamp} onChange={(s) => void update((d) => ({ ...d, stamp: s }))} />
              </div>

              {problems.length > 0 && (
                <ul className="mt-5 list-disc pl-6" aria-label="Before you preview">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => go("moments")}>
                  Back to moments
                </button>
                <button type="button" className="btn btn-primary" onClick={toPreview} disabled={problems.length > 0}>
                  Preview the postcard
                </button>
              </div>
            </section>
          )}
        </div>

        {/* live preview, desktop: the same renderer the recipient sees */}
        <aside className="hidden lg:block" aria-label="Live preview">
          <div className="sticky top-24">
            <p className="m-0 mb-3 text-[0.9rem] font-bold uppercase tracking-[0.1em] text-text-soft">Putting your day together</p>
            {content && (
              <FlipCard face={face} onFaceChange={setFace} label="Preview" front={<PostcardFront content={content} />} back={<PostcardBack content={content} />} />
            )}
          </div>
        </aside>
      </div>

      <AddMomentDialog open={adding} onClose={() => setAdding(false)} onSave={addMoment} />
    </CreatorShell>
  );
}
