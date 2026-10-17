"use client";
// Today's moments as a small, gently fanned pile of photo scraps.
// Deterministic tilts from ids keep the pile stable on every render.
import { motion, useReducedMotion } from "motion/react";
import { Tape } from "@/components/brand";
import { tilt } from "@/lib/layout";
import { formatMomentTime, MAX_MOMENTS, type Moment } from "@/lib/model";
import { useBlobUrl } from "@/lib/useDraft";

export function TodayScraps({ moments }: { moments: Moment[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-1 gap-y-4 p-0 py-2" aria-label="Collected so far">
      {moments.map((m, i) => (
        <motion.li
          key={m.id}
          layout={!reduce}
          initial={reduce ? false : { opacity: 0, y: 18, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: tilt(m.id, 6) }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-[44%] max-w-[11.5rem] sm:w-[31%]"
          style={{ marginLeft: i % 3 ? "-0.6rem" : 0, zIndex: i }}
        >
          <Scrap moment={m} index={i} />
        </motion.li>
      ))}
    </ul>
  );
}

function Scrap({ moment, index }: { moment: Moment; index: number }) {
  const url = useBlobUrl(moment.photoId);
  return (
    <figure className="relative m-0 bg-white p-2 pb-3 shadow-[0_2px_10px_-2px_rgba(43,41,37,0.3)]">
      <Tape style={{ left: "35%", top: "-8px", width: "36%", height: "16px", transform: `rotate(${index % 2 ? 4 : -5}deg)` }} />
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob
        <img src={url} alt={moment.caption || `Moment ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="aspect-[4/3] w-full bg-paper-deep" />
      )}
      <figcaption className="mt-1.5 text-[0.82rem] leading-snug">
        <span className="font-bold">{formatMomentTime(moment.capturedAt)}</span>
        {moment.caption ? <span className="line-clamp-2"> {moment.caption}</span> : null}
      </figcaption>
    </figure>
  );
}

/** A small envelope that quietly fills as moments are added. */
export function EnvelopeMeter({ count }: { count: number }) {
  const fill = Math.min(1, count / MAX_MOMENTS);
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 44" className="h-11 w-16 shrink-0" aria-hidden="true">
        <defs>
          <clipPath id="env-body">
            <rect x="3" y="3" width="58" height="38" rx="5" />
          </clipPath>
        </defs>
        <rect x="3" y="3" width="58" height="38" rx="5" fill="var(--cream)" />
        <rect clipPath="url(#env-body)" x="3" y={41 - 38 * fill} width="58" height={38 * fill} fill="var(--peach)" style={{ transition: "y 400ms, height 400ms" }} />
        <rect x="3" y="3" width="58" height="38" rx="5" fill="none" stroke="var(--ink)" strokeWidth="2.2" />
        <path d="M5 6 L32 25 L59 6" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <p className="m-0 text-[0.95rem] text-text-soft">
        {count === 0 ? "Room for up to six moments." : count >= MAX_MOMENTS ? "Six moments. That's a full postcard." : `${count} of up to ${MAX_MOMENTS} moments.`}
      </p>
    </div>
  );
}
