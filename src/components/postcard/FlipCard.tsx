"use client";
// The signature card turn. A controlled, two-sided postcard:
// - lifts off the desk, pivots about its vertical axis with a slight edge-led
//   tilt, a sheen crosses the paper and the shadow travels, then it settles;
// - ~650 ms, eased like cardstock (slow start, slow landing);
// - the hidden face is `inert` + aria-hidden, so nothing behind is focusable;
// - reduced motion: faces switch with a brief fade, no rotation.
// Lift/shadow idea informed by ela1ne0/ticket-card (MIT); implementation is ours.
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type Face = "front" | "back";

export const TURN_MS = 650;
const TURN_EASE = [0.65, 0, 0.35, 1] as const;

export function FlipCard({
  face,
  onFaceChange,
  front,
  back,
  label = "Postcard",
  controls = true,
  tapToTurn = true,
  className = "",
}: {
  face: Face;
  onFaceChange: (f: Face) => void;
  front: ReactNode;
  back: ReactNode;
  label?: string;
  /** render the persistent "Read the back / See the front" button */
  controls?: boolean;
  tapToTurn?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const liftRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const sheenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const first = useRef(true);
  const [turning, setTurning] = useState(false);
  const statusId = useId();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    const dur = TURN_MS / 1000;
    const dir = face === "back" ? 1 : -1;
    const controlsList = [
      liftRef.current &&
        animate(
          liftRef.current,
          { y: [0, -10, 0], scale: [1, 1.035, 1], rotateZ: [0, -1.4 * dir, 0] },
          { duration: dur, ease: "easeInOut", times: [0, 0.45, 1] },
        ),
      shadowRef.current &&
        animate(
          shadowRef.current,
          { opacity: [1, 0.55, 1], scaleX: [1, 0.86, 1], x: [0, 18 * dir, 0], y: [0, 10, 0] },
          { duration: dur, ease: "easeInOut", times: [0, 0.45, 1] },
        ),
      ...sheenRefs.current.map(
        (el) => el && animate(el, { opacity: [0, 0.32, 0], x: ["-30%", "30%"] }, { duration: dur, ease: "easeInOut" }),
      ),
    ];
    return () => controlsList.forEach((c) => c && c.stop());
  }, [face, reduce]);

  const toggle = () => onFaceChange(face === "front" ? "back" : "front");
  const faceStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    borderRadius: "var(--radius-card)",
    overflow: "hidden",
  };

  return (
    <div className={className}>
      <div
        className="relative"
        style={{ perspective: "1800px" }}
        data-face={face}
        data-turning={turning || undefined}
        onClick={tapToTurn ? toggle : undefined}
      >
        {/* traveling shadow on the desk */}
        <div
          ref={shadowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[4%] -bottom-[3%] top-[8%] rounded-[14px]"
          style={{ background: "rgb(43 41 37 / 0.30)", filter: "blur(16px)" }}
        />
        <div ref={liftRef} style={{ transformStyle: "preserve-3d" }}>
          <motion.div
            className="relative aspect-[3/2] w-full"
            style={{ transformStyle: "preserve-3d", cursor: tapToTurn ? "pointer" : undefined }}
            initial={false}
            animate={reduce ? { rotateY: face === "back" ? 180 : 0, opacity: [0.35, 1] } : { rotateY: face === "back" ? 180 : 0 }}
            transition={reduce ? { rotateY: { duration: 0 }, opacity: { duration: 0.16 } } : { duration: TURN_MS / 1000, ease: TURN_EASE }}
            onAnimationStart={() => setTurning(true)}
            onAnimationComplete={() => setTurning(false)}
          >
            <section
              aria-label={`${label}, front`}
              aria-hidden={face !== "front"}
              inert={face !== "front"}
              style={{ ...faceStyle, boxShadow: "inset 0 0 0 1px rgb(43 41 37 / 0.10)" }}
            >
              {front}
              <div
                ref={(el) => {
                  sheenRefs.current[0] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0"
                style={{ background: "linear-gradient(105deg, transparent 30%, #fff 50%, transparent 70%)" }}
              />
            </section>
            <section
              aria-label={`${label}, back`}
              aria-hidden={face !== "back"}
              inert={face !== "back"}
              style={{ ...faceStyle, transform: "rotateY(180deg)", boxShadow: "inset 0 0 0 1px rgb(43 41 37 / 0.10)" }}
            >
              {back}
              <div
                ref={(el) => {
                  sheenRefs.current[1] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0"
                style={{ background: "linear-gradient(255deg, transparent 30%, #fff 50%, transparent 70%)" }}
              />
            </section>
          </motion.div>
        </div>
      </div>

      {controls && (
        <div className="mt-5 flex justify-center">
          <button type="button" className="btn btn-secondary min-w-[12rem]" onClick={toggle} aria-describedby={statusId}>
            <TurnIcon />
            {face === "front" ? "Read the back" : "See the front"}
          </button>
        </div>
      )}
      <p id={statusId} className="sr-only" aria-live="polite">
        {face === "front" ? "Showing the front of the postcard." : "Showing the back of the postcard."}
      </p>
    </div>
  );
}

function TurnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 4v4.5h-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20v-4.5h4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
