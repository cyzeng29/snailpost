"use client";
// "One page at a time": the calmest way to read a postcard. One thing per
// page (the card, each photo, the message), the same layout on every page,
// and only taps: big Back and Next buttons with words, no swipes, no hidden
// menus, nothing on a timer. The voice note sits above the pages so it keeps
// playing while they turn them; its words sit under the card on page one.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PostcardFront } from "@/components/postcard/PostcardFaces";
import { VoicePlayer } from "@/components/voice/VoicePlayer";
import { formatMomentTime, type PostcardContent } from "@/lib/model";

export function SimpleReader({
  content,
  autoPlay = false,
  showVoiceWords = true,
  end,
}: {
  content: PostcardContent;
  autoPlay?: boolean;
  showVoiceWords?: boolean;
  /** extra controls on the last page (reading options, print) */
  end?: ReactNode;
}) {
  const [page, setPage] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const sender = content.senderName.trim() || "Someone";
  const to = content.recipientName.trim() || "you";
  const words = showVoiceWords && content.written?.text ? content.written : undefined;

  // the card, each moment, the message, and the end
  const last = content.moments.length + 2;
  const go = (n: number) => {
    moved.current = true;
    setPage(Math.max(0, Math.min(last, n)));
  };

  const pages: { title: string; body: ReactNode }[] = [
    {
      title: content.title.trim() || "A little of my day",
      body: (
        <div className="aspect-[3/2] w-full overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
          <PostcardFront content={content} />
        </div>
      ),
    },
    ...content.moments.map((m, i) => ({
      title: content.moments.length === 1 ? "The moment" : `Moment ${i + 1} of ${content.moments.length}`,
      body: (
        <figure className="m-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob/signed URLs */}
          <img
            src={m.src}
            alt={m.caption ? `Photo: ${m.caption}` : `Photo ${i + 1}`}
            className="w-full rounded-[8px] object-contain"
            style={{ aspectRatio: `${m.width} / ${m.height}`, maxHeight: "62vh" }}
          />
          <figcaption className="mt-3 text-[1.15rem] leading-snug">
            {m.caption && <span className="block">{m.caption}</span>}
            <span className="block text-text-soft">{formatMomentTime(m.capturedAt)}</span>
          </figcaption>
        </figure>
      ),
    })),
    {
      title: `A message from ${sender}`,
      body: (
        <div className="rounded-[12px] border border-line bg-surface-raised p-5 text-[1.15rem] leading-relaxed">
          <p className="m-0">Dear {to},</p>
          <p className="m-0 mt-3 whitespace-pre-line">{content.note.trim()}</p>
          <p className="m-0 mt-3">Love, {sender}</p>
        </div>
      ),
    },
    {
      title: "That's the whole postcard",
      body: (
        <div className="space-y-6">
          <p className="m-0 text-[1.15rem]">You can look at it again from the start, or print it to keep.</p>
          <button type="button" className="btn btn-secondary w-full" onClick={() => go(0)}>
            <BackIcon /> Start again from the beginning
          </button>
          {end}
        </div>
      ),
    },
  ];
  const current = pages[Math.min(page, last)];

  useEffect(() => {
    // move focus to the new page's heading, so screen readers announce it
    if (!moved.current) return;
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [page]);

  return (
    <div className="mx-auto max-w-[40rem]" data-testid="simple-reader">
      {content.voice && (
        <div className="mb-5">
          <VoicePlayer src={content.voice.src} durationSec={content.voice.durationSec} label={`Listen to ${sender}`} large autoPlay={autoPlay} />
          {content.isSample && <p className="mt-2 text-[0.9rem] text-text-soft">Sample narration: computer-generated voice, not a real recording.</p>}
        </div>
      )}

      <p className="m-0 text-text-soft" aria-hidden="true">
        Page {page + 1} of {pages.length}
      </p>
      <h2 ref={headingRef} tabIndex={-1} className="display m-0 mt-1 text-[1.6rem] font-[600] leading-tight outline-none">
        <span className="sr-only">
          Page {page + 1} of {pages.length}:{" "}
        </span>
        {current.title}
      </h2>
      <div className="mt-4">{current.body}</div>
      {words && page === 0 && (
        <section aria-label={`What ${sender} says`} className="mt-4 rounded-[12px] border border-line bg-surface-raised p-4">
          <h3 className="m-0 text-[1rem] font-bold">
            {words.kind === "transcript" ? `What ${sender} says` : `About ${sender}'s voice note (not word for word)`}
          </h3>
          <p className="m-0 mt-1 whitespace-pre-line">{words.text}</p>
        </section>
      )}

      <nav aria-label="Turn the pages" className="mt-8 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary min-h-[max(var(--target),64px)] text-[1.15rem]" onClick={() => go(page - 1)} disabled={page === 0}>
          <BackIcon /> Back
        </button>
        <button type="button" className="btn btn-primary min-h-[max(var(--target),64px)] text-[1.15rem]" onClick={() => go(page + 1)} disabled={page === last}>
          Next <NextIcon />
        </button>
      </nav>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
