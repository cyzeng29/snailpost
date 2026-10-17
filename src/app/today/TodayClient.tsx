"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SteamCurl } from "@/components/brand";
import { AddMomentDialog, type NewMomentInput } from "@/components/creator/AddMomentDialog";
import { CreatorShell } from "@/components/creator/CreatorShell";
import { MomentList } from "@/components/creator/MomentList";
import { RecipientChip } from "@/components/creator/RecipientChip";
import { SaveStatus } from "@/components/creator/SaveStatus";
import { EnvelopeMeter, TodayScraps } from "@/components/creator/TodayScraps";
import { currentTimeZone, formatDay, isoWithOffset, localDay, MAX_MOMENTS, newId } from "@/lib/model";
import { useDraft } from "@/lib/useDraft";

export function TodayClient() {
  const router = useRouter();
  const { draft, load, saveState, update, startFresh, retry } = useDraft();
  const [adding, setAdding] = useState(false);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    // the date is the viewer's local day; computed on the client only
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the browser clock and zone
    setToday(localDay(new Date(), currentTimeZone()));
  }, []);

  const moments = draft?.moments ?? [];
  const full = moments.length >= MAX_MOMENTS;
  const staleDay = draft && today && draft.day !== today && moments.length > 0;

  const addMoment = async (m: NewMomentInput) => {
    await update(
      (d) => ({
        ...d,
        moments: [...d.moments, { id: newId("m_"), photoId: m.photoId, caption: m.caption, width: m.width, height: m.height, capturedAt: isoWithOffset(new Date()) }],
      }),
      true,
    );
  };

  return (
    <CreatorShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[0.95rem] font-bold uppercase tracking-[0.1em] text-text-soft">{today ? formatDay(today) : " "}</p>
        <RecipientChip draft={draft} onChange={(name) => void update((d) => ({ ...d, recipient: { ...d.recipient, name } }))} />
      </div>

      <h1 className="display mt-5 text-[2rem] font-[600] leading-[1.1] sm:text-[2.5rem]">What would you like to send home today?</h1>

      {load === "unavailable" && (
        <p role="alert" className="mt-4 rounded-[10px] border-2 border-clay bg-cream p-3">
          This browser isn&apos;t letting the app save anything (private browsing can do this). You can still explore the sample postcard.
        </p>
      )}

      {staleDay && (
        <div className="mt-5 rounded-[12px] border border-line bg-butter/60 p-4">
          <p className="m-0">
            You were collecting moments on <strong>{formatDay(draft.day)}</strong>. Keep adding to that postcard, or start a new one for today. The
            earlier one stays in Keepsakes.
          </p>
          <button type="button" className="btn btn-secondary mt-3" onClick={() => void startFresh({ recipient: draft.recipient, senderName: draft.senderName })}>
            Start today&apos;s postcard
          </button>
        </div>
      )}

      <section className="mt-6" aria-label="Today's moments">
        {moments.length === 0 ? (
          <div className="relative rounded-[16px] border-2 border-dashed border-ink/25 px-5 py-10 text-center">
            <SteamCurl className="mx-auto h-10 w-6" />
            <p className="display m-0 mt-2 text-[1.35rem]">Nothing big has to happen. Breakfast counts.</p>
            <p className="m-0 mt-1 text-text-soft">A small thing is enough.</p>
          </div>
        ) : (
          <TodayScraps moments={moments} />
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <EnvelopeMeter count={moments.length} />
          {draft && <SaveStatus state={saveState} onRetry={retry} />}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {moments.length > 0 && draft && (
          <button type="button" className="btn btn-primary" onClick={() => router.push(`/postcards/${draft.id}/edit`)}>
            Make today&apos;s postcard
          </button>
        )}
        <button
          type="button"
          className={`btn ${moments.length > 0 ? "btn-secondary" : "btn-primary"}`}
          onClick={() => setAdding(true)}
          disabled={full || load === "unavailable" || load === "loading"}
          aria-describedby={full ? "full-note" : undefined}
        >
          <PlusIcon /> Add a little moment
        </button>
        {moments.length === 0 && (
          <Link href="/demo" className="btn btn-secondary">
            Explore a sample postcard
          </Link>
        )}
      </div>
      {full && (
        <p id="full-note" className="mt-2 text-text-soft">
          Six is the most a postcard holds, to keep the story short. Remove one to add another.
        </p>
      )}

      {moments.length > 0 && draft && (
        <section className="mt-10" aria-labelledby="edit-moments">
          <h2 id="edit-moments" className="m-0 text-[1.15rem] font-bold">
            Review and arrange
          </h2>
          <p className="m-0 mt-1 text-text-soft">This order is the order they&apos;ll see.</p>
          <div className="mt-4">
            <MomentList draft={draft} update={update} />
          </div>
        </section>
      )}

      <AddMomentDialog open={adding} onClose={() => setAdding(false)} onSave={addMoment} />
    </CreatorShell>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
