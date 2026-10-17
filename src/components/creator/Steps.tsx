import Link from "next/link";

const STEPS = [
  { key: "moments", label: "Moments" },
  { key: "note", label: "Your note" },
  { key: "preview", label: "Preview" },
] as const;
export type StepKey = (typeof STEPS)[number]["key"];

/** Moments → Your note → Preview. Each step is a link or a button, never a gesture. */
export function Steps({ current, draftId, onSelect }: { current: StepKey; draftId: string; onSelect?: (s: StepKey) => void }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Postcard steps">
      <ol className="m-0 flex list-none items-center gap-1 p-0 text-[0.95rem]">
        {STEPS.map((s, i) => {
          const isCurrent = s.key === current;
          const inner = (
            <>
              <span
                aria-hidden="true"
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.8rem] font-bold ${
                  i <= idx ? "bg-ink text-paper" : "border-2 border-ink/30 text-ink-soft"
                }`}
              >
                {i + 1}
              </span>
              <span className={isCurrent ? "font-bold" : ""}>{s.label}</span>
            </>
          );
          const cls = "inline-flex min-h-[var(--target)] items-center gap-1.5 rounded-full px-2 no-underline";
          return (
            <li key={s.key} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true" className="text-ink/40">→</span>}
              {isCurrent ? (
                <span className={cls} aria-current="step">
                  {inner}
                </span>
              ) : s.key === "preview" ? (
                <Link href={`/postcards/${draftId}/preview`} className={cls}>
                  {inner}
                </Link>
              ) : onSelect ? (
                <button type="button" className={cls} onClick={() => onSelect(s.key)}>
                  {inner}
                </button>
              ) : (
                <Link href={`/postcards/${draftId}/edit${s.key === "note" ? "#note" : ""}`} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
