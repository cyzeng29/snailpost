"use client";
// Plays only after a tap: either its own button, or (with `autoPlay`) the
// "Open postcard" tap that mounted it. If the browser still blocks that, the
// big play button is simply waiting. Play/pause, replay, elapsed/duration, and a gentle failure
// state that keeps the written story available.
import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/audio";

export function VoicePlayer({
  src,
  durationSec,
  label,
  large = false,
  autoPlay = false,
}: {
  src: string;
  durationSec?: number;
  /** e.g. "Play Alex's voice" */
  label: string;
  large?: boolean;
  /** only pass true straight after the listener tapped to open */
  autoPlay?: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const a = audio.current;
    if (autoPlay && a) {
      setStarted(true);
      // a blocked autoplay is not a failure: the play button stays ready
      a.play().catch(() => setStarted(false));
    }
    return () => a?.pause();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  const play = async () => {
    const a = audio.current;
    if (!a) return;
    try {
      setStarted(true);
      await a.play();
    } catch {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <p role="status" className="rounded-[10px] border border-line bg-surface-raised p-4">
        The voice note isn&apos;t loading. You can still read the postcard.
      </p>
    );
  }

  const progress = duration > 0 ? Math.min(1, time / duration) : 0;
  return (
    <div className="rounded-[14px] border border-line bg-surface-raised p-3">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onError={() => setFailed(true)}
      />
      <div className="flex flex-wrap items-center gap-3">
        {playing ? (
          <button type="button" className={`btn btn-primary ${large ? "text-[1.05rem]" : ""}`} onClick={() => audio.current?.pause()}>
            <PauseIcon /> Pause
          </button>
        ) : (
          <button type="button" className={`btn btn-primary ${large ? "text-[1.05rem]" : ""}`} onClick={play}>
            <PlayIcon /> {started && time > 0 ? "Keep listening" : label}
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const a = audio.current;
            if (!a) return;
            a.currentTime = 0;
            setTime(0);
            void play();
          }}
          disabled={!started}
        >
          Replay
        </button>
        <span className="tabular-nums text-text-soft" aria-label={`${formatClock(time)} of ${formatClock(duration)}`}>
          {formatClock(time)} / {formatClock(duration)}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
        <div className="h-full rounded-full bg-action transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
    </svg>
  );
}
