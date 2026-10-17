"use client";
import type { SaveState } from "@/lib/model";

/** Honest local-save state. "Saved for later" means saved on this device. */
export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  return (
    <p role="status" className="m-0 flex items-center gap-2 text-[0.92rem] text-text-soft">
      {state === "saving" && "Saving on this device…"}
      {state === "saved" && (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="var(--moss)" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Saved for later, on this device
        </>
      )}
      {state === "failed" && (
        <span className="text-ink">
          Couldn&apos;t save on this device. Your changes are still here.{" "}
          <button type="button" className="btn btn-quiet min-h-0 p-0 font-bold" onClick={onRetry}>
            Try again
          </button>
        </span>
      )}
    </p>
  );
}
