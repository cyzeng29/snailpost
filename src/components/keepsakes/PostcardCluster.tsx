"use client";
// A tangible pile of postcards. Interaction informed by the user-supplied
// ticket-card reference (which is a single card; the pile is our proposal).
//
// resting   → a shallow fan of up to five cards and a "Browse postcards" button
// browsing  → cards spread; each is a labelled button (hover lifts on desktop)
// selected  → the card rises into a centered reading position (dialog), others
//             recede; it can be turned over; Previous/Next move between cards
// returning → it settles back into the pile; focus returns to its button
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useReducer, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FlipCard } from "@/components/postcard/FlipCard";
import { PostcardBack, PostcardFront } from "@/components/postcard/PostcardFaces";
import { tilt } from "@/lib/layout";
import type { PostcardContent } from "@/lib/model";
import { clusterReducer, initialCluster } from "./clusterState";

export interface ClusterItem {
  key: string;
  content: PostcardContent;
  title: string;
  dateLabel: string;
  statusLabel: string;
}

const MAX_VISIBLE = 5;
const MOVE = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

export function PostcardCluster({
  items,
  groupLabel,
  renderActions,
}: {
  items: ClusterItem[];
  groupLabel: string;
  renderActions?: (item: ClusterItem) => ReactNode;
}) {
  const [state, dispatch] = useReducer(clusterReducer, items.length, initialCluster);
  const reduce = useReducedMotion();
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const browseBtn = useRef<HTMLButtonElement>(null);
  const groupId = useId();
  const lastSelected = useRef(0);

  useEffect(() => dispatch({ type: "count", count: items.length }), [items.length]);

  const open = state.mode === "selected" || state.mode === "returning";
  const selected = items[state.index];
  useEffect(() => {
    if (state.mode === "selected") lastSelected.current = state.index;
  }, [state.mode, state.index]);

  // after returning, focus goes back to the card button that opened it
  useEffect(() => {
    if (state.mode === "browsing" && lastSelected.current >= 0) {
      const el = triggers.current[lastSelected.current];
      if (el && document.activeElement === document.body) el.focus();
    }
  }, [state.mode]);

  // safety net: if the settle animation is interrupted (resize, tab switch),
  // never leave the pile stuck in "returning"
  useEffect(() => {
    if (state.mode !== "returning") return;
    const t = setTimeout(() => dispatch({ type: "returned" }), 900);
    return () => clearTimeout(t);
  }, [state.mode]);

  // with reduced motion there's no layout animation to wait for
  useEffect(() => {
    if (state.mode === "returning" && reduce) {
      dispatch({ type: "returned" });
      requestAnimationFrame(() => triggers.current[lastSelected.current]?.focus());
    }
  }, [state.mode, reduce]);

  if (items.length === 0) return null;
  const transition = reduce ? { duration: 0 } : MOVE;
  const visible = state.mode === "resting" ? items.slice(0, MAX_VISIBLE) : items;

  return (
    <LayoutGroup id={groupId}>
      <section aria-label={groupLabel} className="relative">
        {state.mode === "resting" ? (
          <div className="flex flex-col items-center">
            <div className="relative mx-auto aspect-[3/2] w-[min(100%,26rem)]" aria-hidden="true" data-testid="cluster-resting">
              {visible
                .slice()
                .reverse()
                .map((it, ri) => {
                  const i = visible.length - 1 - ri;
                  return (
                    <motion.div
                      key={it.key}
                      layoutId={`card-${it.key}`}
                      transition={transition}
                      className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[var(--shadow-card)]"
                      style={{ rotate: i === 0 ? tilt(it.key, 2) : (i % 2 ? -1 : 1) * (3 + Math.abs(tilt(it.key, 3))), x: i === 0 ? 0 : (i % 2 ? -1 : 1) * (8 + i * 6), y: i * -7 }}
                    >
                      <PostcardFront content={it.content} />
                    </motion.div>
                  );
                })}
            </div>
            <p className="m-0 mt-6 text-center">
              <span className="font-bold">{items[0].title}</span>
              <span className="text-text-soft">
                {" "}
                · {items[0].dateLabel}
                {items.length > 1 ? ` and ${items.length - 1} more` : ""}
              </span>
            </p>
            <button ref={browseBtn} type="button" className="btn btn-primary mt-3" onClick={() => dispatch({ type: "browse" })}>
              Browse postcards
            </button>
          </div>
        ) : (
          <div>
            <ul className="m-0 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-6 pt-4 sm:flex-wrap sm:justify-center sm:overflow-visible" data-testid="cluster-browsing">
              {items.map((it, i) => {
                const isOut = state.mode === "selected" && i === state.index;
                return (
                  <li key={it.key} className="w-[78%] max-w-[17rem] shrink-0 snap-center sm:w-[15rem]">
                    <button
                      ref={(el) => {
                        triggers.current[i] = el;
                      }}
                      type="button"
                      className="group block w-full rounded-[8px] text-left"
                      onClick={() => dispatch({ type: "select", index: i })}
                      aria-label={`Open postcard: ${it.title}, ${it.dateLabel}, ${it.statusLabel}`}
                      tabIndex={open ? -1 : 0}
                    >
                      {isOut ? (
                        <div className="aspect-[3/2] w-full rounded-[6px] border-2 border-dashed border-ink/20" />
                      ) : (
                        <motion.div
                          layoutId={`card-${it.key}`}
                          transition={transition}
                          onLayoutAnimationComplete={() => state.mode === "returning" && i === state.index && dispatch({ type: "returned" })}
                          className="overflow-hidden rounded-[6px] shadow-[var(--shadow-card)] transition-transform duration-200 group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5 motion-reduce:transition-none"
                          style={{ rotate: tilt(it.key, 3) }}
                          animate={{ opacity: open ? 0.45 : 1, scale: open ? 0.97 : 1 }}
                        >
                          <PostcardFront content={it.content} />
                        </motion.div>
                      )}
                      <span className="mt-3 block font-bold leading-tight">{it.title}</span>
                      <span className="block text-[0.92rem] text-text-soft">
                        {it.dateLabel} · {it.statusLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-center">
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  dispatch({ type: "rest" });
                  requestAnimationFrame(() => browseBtn.current?.focus());
                }}
                disabled={open}
              >
                Put them back in a pile
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {state.mode === "selected" && selected && (
            <SelectedOverlay key="overlay" onClose={() => dispatch({ type: "return" })} reduce={!!reduce}>
              <div className="mx-auto w-full max-w-[46rem]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="selected-title" className="display m-0 text-[1.5rem] font-[600] leading-tight" tabIndex={-1}>
                      {selected.title}
                    </h2>
                    <p className="m-0 text-text-soft">
                      {selected.dateLabel} · {selected.statusLabel}
                    </p>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => dispatch({ type: "return" })}>
                    Back to keepsakes
                  </button>
                </div>

                <motion.div layoutId={`card-${selected.key}`} transition={transition} className="mt-4" data-testid="selected-card">
                  <FlipCard
                    face={state.face}
                    onFaceChange={(f) => dispatch({ type: "face", face: f })}
                    label={selected.title}
                    front={<PostcardFront content={selected.content} />}
                    back={<PostcardBack content={selected.content} />}
                  />
                </motion.div>

                {items.length > 1 && (
                  <nav aria-label="Other postcards" className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
                    <button type="button" className="btn btn-quiet" aria-label="Previous postcard" onClick={() => dispatch({ type: "prev" })}>
                      ← Previous
                    </button>
                    <span className="whitespace-nowrap text-[0.9rem] text-text-soft" aria-live="polite">
                      {state.index + 1} of {items.length}
                    </span>
                    <button type="button" className="btn btn-quiet" aria-label="Next postcard" onClick={() => dispatch({ type: "next" })}>
                      Next →
                    </button>
                  </nav>
                )}
                {renderActions && <div className="mt-4">{renderActions(selected)}</div>}
              </div>
            </SelectedOverlay>
          )}
        </AnimatePresence>
      </section>
    </LayoutGroup>
  );
}

/** Modal reading position: dialog semantics, focus containment, Escape, and an inert page behind. */
function SelectedOverlay({ children, onClose, reduce }: { children: ReactNode; onClose: () => void; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current?.parentElement;
    const siblings = Array.from(document.body.children).filter((el) => el !== root) as HTMLElement[];
    siblings.forEach((el) => (el.inert = true));
    document.documentElement.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("#selected-title")?.focus();
    return () => {
      siblings.forEach((el) => (el.inert = false));
      document.documentElement.style.overflow = "";
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
    if (e.key === "Tab" && ref.current) {
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), input, textarea')).filter(
        (el) => !el.closest("[inert]"),
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-paper/85 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.1 : 0.3 }}
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="selected-title"
        onKeyDown={onKeyDown}
        className="safe-bottom absolute inset-0 overflow-y-auto px-4 py-6 sm:py-10"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
