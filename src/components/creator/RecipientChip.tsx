"use client";
import { useId, useState } from "react";
import type { Draft } from "@/lib/model";

/** "For Grandma" chip; tap to name who it's for. No address book, no street address. */
export function RecipientChip({
  draft,
  onChange,
}: {
  draft: Draft | undefined;
  onChange: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const id = useId();
  const name = draft?.recipient.name.trim();

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(value.trim());
          setEditing(false);
        }}
      >
        <div>
          <label htmlFor={id} className="block text-[0.9rem] font-bold">
            Who&apos;s it for?
          </label>
          <input
            id={id}
            className="field mt-1 w-[13rem]"
            value={value}
            maxLength={40}
            autoFocus
            placeholder="Grandma, Mom, Bà ngoại…"
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Save
        </button>
        <button className="btn btn-quiet" type="button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </form>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex min-h-[var(--target)] items-center gap-2 rounded-full border-2 border-dashed border-ink/35 bg-surface-raised px-4 font-bold"
      onClick={() => {
        setValue(name ?? "");
        setEditing(true);
      }}
    >
      {name ? (
        <>
          For {name} <span className="font-normal text-text-soft">· change</span>
        </>
      ) : (
        "Who's it for?"
      )}
    </button>
  );
}
