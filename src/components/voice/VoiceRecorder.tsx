"use client";
// "Tell it in your voice." Record up to 60 s, listen back, record again, remove.
// Feature-detected; the written postcard stays fully usable without a mic.
import { useEffect, useId, useRef, useState } from "react";
import { audioDuration, formatClock, pickRecordingMime, precheckAudio, recordingSupport, type RecordingSupport } from "@/lib/audio";
import { MAX_VOICE_SECONDS, type Draft, type VoiceNote } from "@/lib/model";
import { putBlob } from "@/lib/store/local";
import { useBlobUrl } from "@/lib/useDraft";
import { VoicePlayer } from "./VoicePlayer";

type Phase = "idle" | "requesting" | "recording" | "saving" | "denied" | "error";

export function VoiceRecorder({
  draft,
  update,
}: {
  draft: Draft;
  update: (fn: (d: Draft) => Draft, immediate?: boolean) => Promise<void>;
}) {
  const [support, setSupport] = useState<RecordingSupport | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const voiceUrl = useBlobUrl(draft.voice?.blobId);
  const writtenId = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability check after mount
    setSupport(recordingSupport());
  }, []);

  const stopTracks = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  };

  // never leave the microphone on when leaving the page
  useEffect(
    () => () => {
      cancelled.current = true;
      if (rec.current && rec.current.state !== "inactive") rec.current.stop();
      stopTracks();
    },
    [],
  );

  const saveVoice = async (blob: Blob, mimeType: string, durationSec: number, source: VoiceNote["source"]) => {
    setPhase("saving");
    try {
      const blobId = await putBlob(blob);
      await update((d) => ({ ...d, voice: { blobId, mimeType, durationSec, source } }), true);
      setPhase("idle");
      setMessage("Voice note saved on this device.");
    } catch {
      setPhase("error");
      setMessage("This device couldn't save the recording. Try again.");
    }
  };

  const start = async () => {
    setMessage(null);
    const mime = pickRecordingMime((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      setSupport("no-codec");
      return;
    }
    setPhase("requesting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      stopTracks();
      const name = (e as DOMException)?.name;
      setPhase(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      if (name !== "NotAllowedError" && name !== "SecurityError") setMessage("No microphone was found. You can upload an audio file instead.");
      return;
    }
    cancelled.current = false;
    chunks.current = [];
    const r = new MediaRecorder(stream.current, { mimeType: mime });
    rec.current = r;
    r.ondataavailable = (ev) => ev.data.size && chunks.current.push(ev.data);
    r.onstop = () => {
      const secs = Math.min(MAX_VOICE_SECONDS, (performance.now() - started.current) / 1000);
      stopTracks();
      if (cancelled.current) return;
      const type = r.mimeType || mime;
      const blob = new Blob(chunks.current, { type: type.split(";")[0] });
      chunks.current = [];
      if (blob.size === 0) {
        setPhase("error");
        setMessage("Nothing was recorded. Check the microphone and try again.");
        return;
      }
      void saveVoice(blob, type.split(";")[0], Math.round(secs * 10) / 10, "recorded");
    };
    started.current = performance.now();
    setElapsed(0);
    r.start(250);
    setPhase("recording");
    tick.current = setInterval(() => {
      const s = (performance.now() - started.current) / 1000;
      setElapsed(s);
      if (s >= MAX_VOICE_SECONDS && r.state === "recording") r.stop();
    }, 200);
  };

  const stop = () => {
    if (rec.current && rec.current.state === "recording") rec.current.stop();
  };

  const onUpload = async (file?: File) => {
    if (!file) return;
    setMessage(null);
    const problem = precheckAudio(file);
    if (problem) {
      setMessage(problem);
      return;
    }
    const d = await audioDuration(file);
    if (Number.isNaN(d)) {
      setMessage("That audio file couldn't be played in this browser. Try an m4a or mp3 file.");
      return;
    }
    if (d > MAX_VOICE_SECONDS + 0.5) {
      setMessage("That recording is longer than a minute. Keep it short and sweet, under 60 seconds.");
      return;
    }
    await saveVoice(file, file.type || "audio/mp4", Math.round(d * 10) / 10, "uploaded");
  };

  const canRecord = support === "supported" && phase !== "denied";
  const sender = draft.senderName.trim() || "your";

  return (
    <div className="rounded-[14px] border border-line bg-surface-raised p-4">
      <h3 className="display m-0 text-[1.3rem] font-[600]">Tell it in your voice.</h3>
      <p className="m-0 mt-1 text-text-soft">Optional. Up to a minute. They know this voice.</p>

      <input
        ref={uploadRef}
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="audio-input"
        onChange={(e) => {
          void onUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="mt-4">
        {phase === "recording" ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={stop}>
              <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-[2px] bg-current" /> Stop
            </button>
            <span className="flex items-center gap-2 font-bold tabular-nums" role="timer" aria-live="off">
              <span aria-hidden="true" className="inline-block h-3 w-3 animate-pulse rounded-full bg-clay motion-reduce:animate-none" />
              Recording {formatClock(elapsed)} / {formatClock(MAX_VOICE_SECONDS)}
            </span>
          </div>
        ) : draft.voice && voiceUrl ? (
          <div className="space-y-3">
            <VoicePlayer src={voiceUrl} durationSec={draft.voice.durationSec} label="Listen back" />
            <div className="flex flex-wrap gap-2">
              {canRecord && (
                <button type="button" className="btn btn-secondary" onClick={start} disabled={phase === "requesting" || phase === "saving"}>
                  Record again
                </button>
              )}
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  void update((d) => ({ ...d, voice: undefined }), true);
                  setMessage("Voice note removed.");
                }}
              >
                Remove voice note
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {canRecord && (
              <button type="button" className="btn btn-primary" onClick={start} disabled={phase === "requesting" || phase === "saving"}>
                <MicIcon /> {phase === "requesting" ? "Waiting for the microphone…" : "Record"}
              </button>
            )}
            <button type="button" className={`btn ${canRecord ? "btn-quiet" : "btn-secondary"}`} onClick={() => uploadRef.current?.click()}>
              Upload an audio file
            </button>
          </div>
        )}
      </div>

      <div aria-live="polite" className="mt-3 space-y-2">
        {phase === "denied" && (
          <p className="m-0">
            Microphone access is off, and that&apos;s fine. Your written postcard works without it. To record, allow the microphone in your
            browser&apos;s site settings, or upload an audio file.
          </p>
        )}
        {support && support !== "supported" && phase !== "denied" && (
          <p className="m-0">
            {support === "insecure"
              ? "Recording needs a secure (https) connection."
              : "This browser can't record audio here."}{" "}
            You can upload an audio file, or just send the written postcard.
          </p>
        )}
        {phase === "saving" && <p className="m-0">Saving the voice note on this device…</p>}
        {message && <p className="m-0">{message}</p>}
      </div>

      {draft.voice && (
        <div className="mt-5 border-t border-line pt-4">
          <fieldset className="m-0 border-0 p-0">
            <legend className="font-bold">Words to read along</legend>
            <p className="m-0 mt-1 text-text-soft">So {draft.recipient.name.trim() || "they"} can read it too, or if the audio won&apos;t play.</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {(
                [
                  ["transcript", "Exactly what I said (transcript)"],
                  ["summary", "A short summary, in my words"],
                ] as const
              ).map(([kind, text]) => (
                <label key={kind} className="flex min-h-[var(--target)] items-center gap-2">
                  <input
                    type="radio"
                    name="written-kind"
                    className="h-5 w-5 accent-[var(--clay)]"
                    checked={(draft.written?.kind ?? "summary") === kind}
                    onChange={() => void update((d) => ({ ...d, written: { kind, text: d.written?.text ?? "" } }))}
                  />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor={writtenId} className="sr-only">
            {draft.written?.kind === "transcript" ? "Transcript" : "Written summary"} of {sender} voice note
          </label>
          <textarea
            id={writtenId}
            className="field mt-2 min-h-[6rem] resize-y"
            maxLength={1200}
            value={draft.written?.text ?? ""}
            onChange={(e) => void update((d) => ({ ...d, written: { kind: d.written?.kind ?? "summary", text: e.target.value } }))}
            placeholder={draft.written?.kind === "transcript" ? "Type what you said, word for word." : "In a sentence or two, what the voice note is about."}
          />
          <p className="m-0 mt-1 text-[0.9rem] text-text-soft">
            Only choose “transcript” if it&apos;s word for word. Automatic transcription isn&apos;t set up in this version.
          </p>
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
