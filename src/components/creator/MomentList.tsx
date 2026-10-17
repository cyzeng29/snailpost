"use client";
// Review, caption, reorder (tap controls first; drag is optional), replace and
// remove moments. Order here is the order on the card, the letter and the PDF.
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useState } from "react";
import { formatMomentTime, moveItem, type Draft, type Moment } from "@/lib/model";
import { useBlobUrl } from "@/lib/useDraft";
import { AddMomentDialog, type NewMomentInput } from "./AddMomentDialog";

export function MomentList({
  draft,
  update,
}: {
  draft: Draft;
  update: (fn: (d: Draft) => Draft, immediate?: boolean) => Promise<void>;
}) {
  const [replacing, setReplacing] = useState<Moment | null>(null);
  const [removed, setRemoved] = useState<{ moment: Moment; index: number } | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 8000);
    return () => clearTimeout(t);
  }, [removed]);

  const move = (from: number, to: number) => {
    void update((d) => ({ ...d, moments: moveItem(d.moments, from, to) }));
    setAnnounce(`Moved to position ${to + 1} of ${draft.moments.length}.`);
    // keep focus on the same control of the moved item after re-render
    requestAnimationFrame(() => {
      const btn = document.querySelector<HTMLButtonElement>(`[data-move="${from > to ? "up" : "down"}"][data-index="${to}"]`);
      (btn && !btn.disabled ? btn : document.querySelector<HTMLButtonElement>(`[data-caption-index="${to}"]`))?.focus();
    });
  };

  const remove = (index: number) => {
    const moment = draft.moments[index];
    void update((d) => ({ ...d, moments: d.moments.filter((m) => m.id !== moment.id) }), true);
    setRemoved({ moment, index });
    setAnnounce("Moment removed.");
  };

  const undo = () => {
    if (!removed) return;
    void update((d) => {
      const moments = d.moments.slice();
      moments.splice(Math.min(removed.index, moments.length), 0, removed.moment);
      return { ...d, moments };
    }, true);
    setRemoved(null);
    setAnnounce("Moment restored.");
  };

  const onReplace = async (m: NewMomentInput) => {
    if (!replacing) return;
    await update(
      (d) => ({
        ...d,
        moments: d.moments.map((x) => (x.id === replacing.id ? { ...x, photoId: m.photoId, width: m.width, height: m.height, caption: m.caption } : x)),
      }),
      true,
    );
    setAnnounce("Photo replaced.");
  };

  return (
    <div>
      <Reorder.Group
        as="ol"
        axis="y"
        values={draft.moments}
        onReorder={(next) => void update((d) => ({ ...d, moments: next }))}
        className="m-0 grid list-none gap-3 p-0"
        aria-label="Today's moments, in order"
      >
        {draft.moments.map((m, i) => (
          <MomentRow
            key={m.id}
            moment={m}
            index={i}
            count={draft.moments.length}
            onCaption={(caption) => void update((d) => ({ ...d, moments: d.moments.map((x) => (x.id === m.id ? { ...x, caption } : x)) }))}
            onMove={move}
            onRemove={() => remove(i)}
            onReplace={() => setReplacing(m)}
          />
        ))}
      </Reorder.Group>

      <div aria-live="polite" className="mt-2 min-h-[1.5rem]">
        {removed ? (
          <p className="m-0 flex flex-wrap items-center gap-2">
            Moment removed.
            <button type="button" className="btn btn-quiet" onClick={undo}>
              Undo
            </button>
          </p>
        ) : (
          <span className="sr-only">{announce}</span>
        )}
      </div>

      <AddMomentDialog
        open={!!replacing}
        mode="replace"
        initialCaption={replacing?.caption ?? ""}
        onClose={() => setReplacing(null)}
        onSave={onReplace}
      />
    </div>
  );
}

function MomentRow({
  moment,
  index,
  count,
  onCaption,
  onMove,
  onRemove,
  onReplace,
}: {
  moment: Moment;
  index: number;
  count: number;
  onCaption: (c: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const url = useBlobUrl(moment.photoId);
  const drag = useDragControls();
  const n = index + 1;
  return (
    <Reorder.Item
      value={moment}
      dragListener={false}
      dragControls={drag}
      className="relative rounded-[12px] border border-line bg-surface-raised p-3"
      data-testid="moment-row"
    >
      <div className="flex gap-3">
        <div className="relative w-[6.5rem] shrink-0 sm:w-[8rem]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob
            <img src={url} alt={moment.caption ? `Moment ${n}: ${moment.caption}` : `Moment ${n}`} className="aspect-[4/3] w-full rounded-[6px] object-cover" />
          ) : (
            <div className="aspect-[4/3] w-full rounded-[6px] bg-paper-deep" />
          )}
          <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 text-[0.8rem] font-bold text-paper" aria-hidden="true">
            {n}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-[0.9rem] font-bold" htmlFor={`cap-${moment.id}`}>
            {formatMomentTime(moment.capturedAt)} <span className="font-normal text-text-soft">· caption for moment {n}</span>
          </label>
          <textarea
            id={`cap-${moment.id}`}
            data-caption-index={index}
            className="field mt-1 min-h-[3.2rem] resize-y py-2"
            maxLength={200}
            rows={2}
            value={moment.caption}
            placeholder="Tell them the bit the photo can't."
            onChange={(e) => onCaption(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" className="btn btn-icon" data-move="up" data-index={index} aria-label={`Move moment ${n} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
          <Arrow dir="up" />
        </button>
        <button type="button" className="btn btn-icon" data-move="down" data-index={index} aria-label={`Move moment ${n} down`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
          <Arrow dir="down" />
        </button>
        <button type="button" className="btn btn-quiet" onClick={onReplace}>
          Replace photo
        </button>
        <button type="button" className="btn btn-quiet" onClick={onRemove} aria-label={`Remove moment ${n}`}>
          Remove
        </button>
        <span
          className="ml-auto hidden cursor-grab touch-none select-none rounded-[8px] px-2 py-2 text-text-soft sm:inline-flex"
          onPointerDown={(e) => drag.start(e)}
          aria-hidden="true"
          title="Drag to reorder"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.7" fill="currentColor" />))}
          </svg>
        </span>
      </div>
    </Reorder.Item>
  );
}

function Arrow({ dir }: { dir: "up" | "down" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: dir === "down" ? "rotate(180deg)" : undefined }}>
      <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
