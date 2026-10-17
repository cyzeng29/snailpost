"use client";
// The sender's controls for how a postcard opens for the person receiving it.
// Used for the saved defaults in Settings and per postcard in Preview.
import { useId } from "react";
import type { ReadingSetup, TextSize } from "@/lib/model";

const VIEWS: { value: ReadingSetup["view"]; name: string; desc: string }[] = [
  { value: "simple", name: "One page at a time", desc: "Each photo gets its own page, with big Back and Next buttons. Best for grandparents." },
  { value: "full", name: "Everything on one page", desc: "The card, your words and photos together. They scroll down to read." },
];

export const TEXT_SIZE_NAMES: Record<TextSize, string> = { normal: "Regular", large: "Larger", largest: "Largest" };

export function ReadingSetupFields({ value, onChange, who }: { value: ReadingSetup; onChange: (r: ReadingSetup) => void; who: string }) {
  const id = useId();
  const set = (patch: Partial<ReadingSetup>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <fieldset className="border-0 p-0">
        <legend className="font-bold">How {who} sees it</legend>
        <div className="mt-2 grid gap-2">
          {VIEWS.map((v) => (
            <label key={v.value} className={`flex cursor-pointer gap-3 rounded-[12px] border-2 p-3 ${value.view === v.value ? "border-ink bg-surface-raised" : "border-line"}`}>
              <input type="radio" name={`${id}-view`} className="mt-1 h-5 w-5 shrink-0 accent-[var(--clay)]" checked={value.view === v.value} onChange={() => set({ view: v.value })} />
              <span>
                <span className="block font-bold">{v.name}</span>
                <span className="block text-text-soft">{v.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className="font-bold">Text size for {who}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(TEXT_SIZE_NAMES) as TextSize[]).map((t) => (
            <label key={t} className={`flex min-h-[var(--target)] cursor-pointer items-center gap-2 rounded-full border-2 px-4 ${value.textSize === t ? "border-ink" : "border-line"}`}>
              <input type="radio" name={`${id}-text`} className="h-5 w-5 accent-[var(--clay)]" checked={value.textSize === t} onChange={() => set({ textSize: t })} />
              {TEXT_SIZE_NAMES[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className="font-bold">Your voice note</legend>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--clay)]" checked={value.playVoiceOnOpen} onChange={(e) => set({ playVoiceOnOpen: e.target.checked })} />
            <span>Start playing when {who} opens the postcard</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--clay)]" checked={value.showVoiceWords} onChange={(e) => set({ showVoiceWords: e.target.checked })} />
            <span>Show the words of the voice note next to it, for anyone hard of hearing</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
