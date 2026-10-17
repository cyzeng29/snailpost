"use client";
// The recipient's calm, Easy Reading experience. No sign-up, no creator
// navigation. One short envelope opening on first visit; repeat visits go
// straight to the card.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/components/AppearanceProvider";
import { Spiral, Wordmark } from "@/components/brand";
import { FlipCard, type Face } from "@/components/postcard/FlipCard";
import { LetterView } from "@/components/postcard/LetterView";
import { PostcardBack, PostcardFront } from "@/components/postcard/PostcardFaces";
import { PrintButton } from "@/components/print/PrintButton";
import { VoicePlayer } from "@/components/voice/VoicePlayer";
import { formatDay, type PostcardContent } from "@/lib/model";

const OPENED_KEY = "snailpost.opened";

function wasOpened(id: string) {
  try {
    return (JSON.parse(localStorage.getItem(OPENED_KEY) ?? "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}
function markOpened(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem(OPENED_KEY) ?? "[]") as string[];
    if (!list.includes(id)) localStorage.setItem(OPENED_KEY, JSON.stringify([...list, id].slice(-50)));
  } catch {
    /* fine: they'll just see the envelope again */
  }
}

export function RecipientView({ content, shareUrl }: { content: PostcardContent; shareUrl?: string }) {
  const [opened, setOpened] = useState(false);
  const [face, setFace] = useState<Face>("front");
  const [mode, setMode] = useState<"card" | "letter">("card");
  const reduce = useReducedMotion();
  const { prefs, setTextSize, setAppearance } = useAppearance();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sender = content.senderName.trim() || "Someone";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read per-viewer storage after mount
    if (wasOpened(content.id)) setOpened(true);
  }, [content.id]);

  const open = () => {
    setOpened(true);
    markOpened(content.id);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  return (
    <div className="mx-auto w-full max-w-[52rem] px-4 pb-16 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-2">
        <Wordmark />
      </header>

      {content.isSample && (
        <p className="mt-2 rounded-[10px] border-2 border-dashed border-ink/40 bg-butter/60 px-4 py-3 text-[0.95rem]" role="note">
          <strong>Sample postcard.</strong> {content.sampleNotice}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {!opened ? (
          <motion.section
            key="envelope"
            className="mt-8 flex flex-col items-center text-center"
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24, transition: { duration: 0.35 } }}
          >
            <h1 className="display m-0 max-w-[22ch] text-[2rem] font-[600] leading-tight sm:text-[2.4rem]">
              A little of {sender}&apos;s day, for you.
            </h1>
            <p className="mt-3 text-[1.1rem] text-text-soft">{formatDay(content.day, { year: true })}</p>
            <Envelope />
            <button type="button" className="btn btn-primary mt-8 min-w-[14rem] text-[1.15rem]" onClick={open} autoFocus>
              Open postcard
            </button>
          </motion.section>
        ) : (
          <motion.main
            key="card"
            className="mt-6"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 ref={headingRef} tabIndex={-1} className="display m-0 text-[1.75rem] font-[600] leading-tight outline-none sm:text-[2.1rem]">
              From {sender}, {formatDay(content.day, { weekday: true })}
            </h1>
            <p className="mt-1 text-text-soft">
              {content.title.trim()}
              {content.fromPlace ? ` · ${content.fromPlace}` : ""}
            </p>

            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="How to read it">
              <button type="button" className={`btn ${mode === "card" ? "btn-primary" : "btn-secondary"}`} aria-pressed={mode === "card"} onClick={() => setMode("card")}>
                See the postcard
              </button>
              <button type="button" className={`btn ${mode === "letter" ? "btn-primary" : "btn-secondary"}`} aria-pressed={mode === "letter"} onClick={() => setMode("letter")}>
                Read as a letter
              </button>
            </div>

            {content.voice && (
              <div className="mt-5">
                <VoicePlayer src={content.voice.src} durationSec={content.voice.durationSec} label={`Play ${sender}'s voice`} large />
                {content.isSample && <p className="mt-2 text-[0.9rem] text-text-soft">Sample narration: computer-generated voice, not a real recording.</p>}
              </div>
            )}

            <div className="mt-6">
              {mode === "card" ? (
                <>
                  <FlipCard
                    className="mx-auto max-w-[44rem]"
                    face={face}
                    onFaceChange={setFace}
                    label={content.title || "Postcard"}
                    front={<PostcardFront content={content} />}
                    back={<PostcardBack content={content} />}
                  />
                  <div className="mx-auto mt-8 max-w-[38rem] space-y-4">
                    <section aria-label="The message" className="rounded-[12px] border border-line bg-surface-raised p-5">
                      <p className="m-0">Dear {content.recipientName.trim() || "you"},</p>
                      <p className="m-0 mt-2 whitespace-pre-line">{content.note}</p>
                      <p className="m-0 mt-2">Love, {sender}</p>
                    </section>
                    <h2 className="m-0 text-[1.15rem] font-bold">The moments</h2>
                    <ol className="m-0 list-decimal space-y-2 pl-6 marker:font-bold">
                      {content.moments.map((m) => (
                        <li key={m.id}>{m.caption || "A photo"}</li>
                      ))}
                    </ol>
                    {content.written?.text && (
                      <details className="rounded-[10px] border border-line bg-surface-raised p-4">
                        <summary className="cursor-pointer font-bold">
                          {content.written.kind === "transcript" ? "Read what the voice note says" : "Read a written summary of the voice note"}
                        </summary>
                        <p className="mt-3 whitespace-pre-line">{content.written.text}</p>
                      </details>
                    )}
                  </div>
                </>
              ) : (
                <LetterView content={content} />
              )}
            </div>

            <section className="mx-auto mt-10 max-w-[38rem] border-t border-line pt-6" aria-label="Reading options">
              <h2 className="m-0 text-[1.15rem] font-bold">Make it easier to read</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-pressed={prefs.textSize === "large"}
                  onClick={() => setTextSize(prefs.textSize === "large" ? "normal" : "large")}
                >
                  {prefs.textSize === "large" ? "Use regular text" : "Use larger text"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAppearance("reader", prefs.reader === "reading" ? "studio" : "reading")}
                >
                  {prefs.reader === "reading" ? "Switch to the colorful look" : "Switch to the calm look"}
                </button>
              </div>

              <h2 className="mt-8 text-[1.15rem] font-bold">Keep it</h2>
              <p className="mt-1">Print it for the fridge or a keepsake box.</p>
              <div className="mt-3">
                <PrintButton content={content} shareUrl={shareUrl} label="Print this postcard" />
              </div>
            </section>

            <p className="display mt-12 flex items-center justify-center gap-2 text-center text-[1.25rem]">
              <Spiral className="h-6 w-6" /> Keep this little piece of today.
            </p>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

function Envelope() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static decorative SVG
    <img src="/brand/envelope.svg" alt="" className="mt-8 w-[min(18rem,80vw)] drop-shadow-[0_10px_18px_rgba(43,41,37,0.18)]" />
  );
}
