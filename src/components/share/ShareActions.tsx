"use client";
// Share through the device's own share sheet, with a visible copy-link fallback.
// States are truthful: a finished share sheet means "handed to another app",
// never "delivered" or "read". Cancelling is normal, not an error.
import { useEffect, useId, useRef, useState } from "react";

type Status =
  | { s: "idle" }
  | { s: "shared" }
  | { s: "cancelled" }
  | { s: "copied" }
  | { s: "copy-failed" }
  | { s: "share-failed" };

export function canNativeShare(url: string) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    return typeof navigator.canShare === "function" ? navigator.canShare({ url }) : true;
  } catch {
    return false;
  }
}

export function ShareActions({ url, title, text }: { url: string; title: string; text?: string }) {
  const [status, setStatus] = useState<Status>({ s: "idle" });
  const [native, setNative] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const linkId = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection needs the browser
    setNative(canNativeShare(url));
  }, [url]);

  const share = async () => {
    try {
      await navigator.share({ title, text, url });
      setStatus({ s: "shared" });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setStatus(name === "AbortError" ? { s: "cancelled" } : { s: "share-failed" });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ s: "copied" });
    } catch {
      setStatus({ s: "copy-failed" });
      requestAnimationFrame(() => inputRef.current?.select());
    }
  };

  return (
    <div>
      <label htmlFor={linkId} className="block font-bold">
        Postcard link
      </label>
      <input
        id={linkId}
        ref={inputRef}
        readOnly
        value={url}
        className="field mt-1 font-mono text-[0.9rem]"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {native && (
          <button type="button" className="btn btn-primary" onClick={share}>
            <ShareIcon /> Share…
          </button>
        )}
        <button type="button" className={`btn ${native ? "btn-secondary" : "btn-primary"}`} onClick={copy}>
          <CopyIcon /> Copy link
        </button>
      </div>
      <p aria-live="polite" className="m-0 mt-3 min-h-[1.5rem]">
        {status.s === "shared" && "Passed to your messaging app. Snailpost can't see whether it was sent or opened."}
        {status.s === "cancelled" && "No problem. The link is still ready whenever you are."}
        {status.s === "copied" && "Link copied. Paste it into WhatsApp, Messages, WeChat or wherever you talk."}
        {status.s === "copy-failed" && "Copying didn't work here. The link is selected above, so you can copy it yourself."}
        {status.s === "share-failed" && "The share sheet didn't open. Use “Copy link” instead."}
      </p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15V3M7.5 7.5L12 3l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v8h14v-8" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}
