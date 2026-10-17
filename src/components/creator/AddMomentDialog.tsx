"use client";
import { useEffect, useId, useRef, useState } from "react";
import { IMAGE_ACCEPT, ImageIntakeError, processImage, type ProcessedImage } from "@/lib/media";
import { putBlob } from "@/lib/store/local";

export interface NewMomentInput {
  photoId: string;
  width: number;
  height: number;
  caption: string;
  lowResolution: boolean;
}

type Phase =
  | { p: "pick" }
  | { p: "processing" }
  | { p: "review"; img: ProcessedImage; preview: string }
  | { p: "saving"; img: ProcessedImage; preview: string };

/**
 * Add (or replace) a moment. Native <dialog> gives focus containment and
 * Escape; focus returns to the control that opened it.
 */
export function AddMomentDialog({
  open,
  onClose,
  onSave,
  mode = "add",
  initialCaption = "",
}: {
  open: boolean;
  onClose: () => void;
  onSave: (m: NewMomentInput) => Promise<void> | void;
  mode?: "add" | "replace";
  initialCaption?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ p: "pick" });
  const [caption, setCaption] = useState(initialCaption);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const captionId = useId();
  const hintId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      setPhase({ p: "pick" });
      setCaption(initialCaption);
      setError(null);
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, initialCaption]);

  // release the preview URL when it changes or the dialog unmounts
  const previewUrl = phase.p === "review" || phase.p === "saving" ? phase.preview : undefined;
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleClose = () => {
    onClose();
    const el = opener.current as HTMLElement | null;
    if (el && typeof el.focus === "function") requestAnimationFrame(() => el.focus());
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setPhase({ p: "processing" });
    try {
      const img = await processImage(file);
      setPhase({ p: "review", img, preview: URL.createObjectURL(img.blob) });
    } catch (e) {
      setError(e instanceof ImageIntakeError ? e.message : "That photo couldn't be opened. Try another one.");
      setPhase({ p: "pick" });
    }
  };

  const save = async () => {
    if (phase.p !== "review") return;
    setPhase({ ...phase, p: "saving" });
    setError(null);
    try {
      const photoId = await putBlob(phase.img.blob);
      await onSave({ photoId, width: phase.img.width, height: phase.img.height, caption: caption.trim(), lowResolution: phase.img.lowResolution });
      ref.current?.close();
    } catch {
      setError("This device couldn't save the photo (storage may be full or blocked). Your photo is still here. Try again.");
      setPhase({ ...phase, p: "review" });
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={handleClose}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-auto rounded-[16px] border border-line bg-surface p-0 text-text shadow-[var(--shadow-card)] backdrop:bg-ink/45"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="display m-0 text-[1.5rem] font-[600]">
            {mode === "add" ? "Add a little moment" : "Replace the photo"}
          </h2>
          <button type="button" className="btn btn-icon" aria-label="Close" onClick={() => ref.current?.close()}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* hidden native inputs, driven by labelled buttons */}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="camera-input" />
        <input ref={libraryInput} type="file" accept={IMAGE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="library-input" />

        {error && (
          <p role="alert" className="mt-4 rounded-[10px] border-2 border-clay bg-cream p-3">
            {error}
          </p>
        )}

        {phase.p === "pick" && (
          <div className="mt-5 grid gap-3">
            <button type="button" className="btn btn-primary w-full" onClick={() => cameraInput.current?.click()}>
              <CameraIcon /> Take a photo
            </button>
            <button type="button" className="btn btn-secondary w-full" onClick={() => libraryInput.current?.click()}>
              <PhotosIcon /> Choose from your photos
            </button>
            <p className="m-0 text-[0.92rem] text-text-soft">
              Photos stay on this device until you choose to send a postcard. Location details are removed.
            </p>
          </div>
        )}

        {phase.p === "processing" && (
          <p role="status" className="mt-6 flex items-center gap-3">
            <Spinner /> Getting your photo ready…
          </p>
        )}

        {(phase.p === "review" || phase.p === "saving") && (
          <div className="mt-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={phase.preview} alt="The photo you chose" className="max-h-[40dvh] w-full rounded-[8px] bg-paper-deep object-contain" />
            {phase.img.lowResolution && (
              <p className="mt-2 text-[0.92rem] text-text-soft">This photo is small, so it may look soft if you print the postcard. It&apos;s fine for the link.</p>
            )}
            <label htmlFor={captionId} className="mt-4 block font-bold">
              Caption <span className="font-normal text-text-soft">(optional)</span>
            </label>
            <p id={hintId} className="m-0 text-text-soft">
              Tell them the bit the photo can&apos;t.
            </p>
            <textarea
              id={captionId}
              aria-describedby={hintId}
              className="field mt-2 min-h-[5.5rem] resize-y"
              maxLength={200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tried your eggs. Still not as good as yours."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={save} disabled={phase.p === "saving"} aria-busy={phase.p === "saving"}>
                {phase.p === "saving" ? "Saving on this device…" : mode === "add" ? "Add to today" : "Use this photo"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPhase({ p: "pick" })} disabled={phase.p === "saving"}>
                Choose a different photo
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-ink/20 border-t-clay motion-reduce:animate-none" />;
}
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8h4l2-3h6l2 3h4v11H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function PhotosIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
