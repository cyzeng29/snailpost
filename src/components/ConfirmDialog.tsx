"use client";
import { useEffect, useId, useRef } from "react";

/** Native <dialog> confirmation: Escape cancels, focus returns to the opener. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  const restore = () => requestAnimationFrame(() => (opener.current as HTMLElement | null)?.focus?.());

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={() => {
        onCancel();
        restore();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[16px] border border-line bg-surface p-6 text-text shadow-[var(--shadow-card)] backdrop:bg-ink/45"
    >
      <h2 id={titleId} className="display m-0 text-[1.35rem] font-[600]">
        {title}
      </h2>
      <p id={bodyId} className="mt-2">
        {body}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => ref.current?.close()} autoFocus>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onConfirm();
            ref.current?.close();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
