"use client";
import { Stamp } from "@/components/brand";
import { STAMPS, type StampId } from "@/lib/brand";

/** Choose one stamp. Each marks a kind of moment, never a reward or streak. */
export function StampPicker({ value, onChange }: { value: StampId; onChange: (s: StampId) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="font-bold">Choose a stamp</legend>
      <p className="m-0 mt-1 text-text-soft">The first one already looks good.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAMPS.map((s) => {
          const checked = value === s.id;
          return (
            <label
              key={s.id}
              className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border-2 p-3 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
                checked ? "border-ink bg-surface-raised" : "border-line hover:border-ink/40"
              }`}
            >
              <input type="radio" name="stamp" value={s.id} checked={checked} onChange={() => onChange(s.id)} className="sr-only" />
              <Stamp id={s.id} className="h-auto w-14" style={{ transform: checked ? "rotate(-3deg)" : undefined }} />
              <span className="font-bold leading-tight">{s.name}</span>
              <span className="text-[0.85rem] leading-snug text-text-soft">{s.hint}</span>
              {checked && (
                <span className="absolute right-2 top-2 rounded-full bg-ink px-1.5 text-[0.75rem] font-bold text-paper">
                  <span aria-hidden="true">✓</span>
                  <span className="sr-only">selected</span>
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
