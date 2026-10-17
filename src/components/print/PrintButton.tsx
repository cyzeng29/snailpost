"use client";
import { useEffect, useState } from "react";
import type { PostcardContent } from "@/lib/model";

type State =
  | { s: "idle" }
  | { s: "working" }
  | { s: "ready"; url: string; filename: string; lowRes: boolean; continuation: boolean; qr: boolean }
  | { s: "failed" };

async function fetchBytes(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function toJpeg(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
  if (!blob) throw new Error("encode");
  return new Uint8Array(await blob.arrayBuffer());
}

export function filenameFor(content: PostcardContent) {
  const slug = (content.title || "postcard").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `snailpost-${content.day}-${slug || "postcard"}.pdf`;
}

export function PrintButton({
  content,
  shareUrl,
  label = "Print a keepsake",
}: {
  content: PostcardContent;
  /** canonical public link; the QR is only printed when this is a real https URL */
  shareUrl?: string;
  label?: string;
}) {
  const [state, setState] = useState<State>({ s: "idle" });

  useEffect(() => {
    return () => {
      if (state.s === "ready") URL.revokeObjectURL(state.url);
    };
  }, [state]);

  const make = async () => {
    setState({ s: "working" });
    try {
      const { buildPostcardPdf } = await import("@/lib/pdf");
      const { bytes, report } = await buildPostcardPdf(content, { fetchBytes, toJpeg }, { shareUrl });
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const filename = filenameFor(content);
      setState({ s: "ready", url, filename, lowRes: report.lowResolution.length > 0, continuation: report.continuation, qr: !!report.qrUrl });
      // start the download right away; the link below stays as a fallback
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setState({ s: "failed" });
    }
  };

  return (
    <div>
      <button type="button" className="btn btn-secondary" onClick={make} disabled={state.s === "working"} aria-busy={state.s === "working"}>
        <PrinterIcon />
        {state.s === "working" ? "Making the printable postcard…" : label}
      </button>
      <div aria-live="polite" className="mt-3 space-y-2 text-[0.95rem]">
        {state.s === "ready" && (
          <>
            <p className="m-0">
              Your postcard PDF is ready: two 6 × 4 in pages, front then back.{" "}
              <a href={state.url} download={state.filename} className="font-bold underline">
                Download again
              </a>{" "}
              or{" "}
              <a href={state.url} target="_blank" rel="noopener" className="font-bold underline">
                open it to print
              </a>
              .
            </p>
            <p className="m-0 text-text-soft">
              Print at actual size (100%, not “fit to page”). For two-sided cards, flip on the short edge. Home printers don&apos;t
              always line both sides up perfectly, so try plain paper first.
            </p>
            {state.qr && <p className="m-0 text-text-soft">The QR code on the back opens the same unlisted postcard link.</p>}
            {state.lowRes && <p className="m-0">One or more photos are small, so they may look a little soft in print.</p>}
            {state.continuation && <p className="m-0">The note is long, so it continues on a third page.</p>}
          </>
        )}
        {state.s === "failed" && <p className="m-0">The printable postcard couldn&apos;t be made just now. Your postcard is safe. Please try again.</p>}
      </div>
    </div>
  );
}

function PrinterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 14h10v7H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
