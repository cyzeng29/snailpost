// Voice note helpers: codec negotiation and file validation. No single codec
// works on every phone, so we ask the browser what it can record.

export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

/** Preference order: small, widely playable formats first. */
export const RECORDING_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2", // Safari/iOS; plays everywhere
  "audio/mp4",
  "audio/webm;codecs=opus", // Chrome/Firefox/Android
  "audio/webm",
  "audio/ogg;codecs=opus",
];

export function pickRecordingMime(isTypeSupported: (t: string) => boolean): string | null {
  for (const t of RECORDING_CANDIDATES) {
    try {
      if (isTypeSupported(t)) return t;
    } catch {
      /* some engines throw on unknown strings */
    }
  }
  return null;
}

export type RecordingSupport = "supported" | "no-mediadevices" | "no-mediarecorder" | "no-codec" | "insecure";

export function recordingSupport(): RecordingSupport {
  if (typeof window === "undefined") return "no-mediadevices";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "no-mediadevices";
  if (typeof MediaRecorder === "undefined") return "no-mediarecorder";
  if (!pickRecordingMime((t) => MediaRecorder.isTypeSupported(t))) return "no-codec";
  return "supported";
}

export function precheckAudio(file: { type: string; name: string; size: number }): string | null {
  if (file.size === 0) return "That file is empty. Try choosing it again.";
  if (file.size > MAX_AUDIO_BYTES) return "That audio file is over 12 MB. A minute of voice is usually much smaller.";
  if (!file.type.startsWith("audio/") && !/\.(m4a|mp3|aac|wav|webm|ogg|opus)$/i.test(file.name))
    return "That file isn't audio this app can use. Try an m4a, mp3 or wav file.";
  return null;
}

/** Read the duration of an audio blob; resolves NaN if the browser can't tell. */
export function audioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    const done = (v: number) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration)) return done(a.duration);
      // Chrome reports Infinity for fresh webm recordings until it seeks.
      a.currentTime = 1e7;
      a.ontimeupdate = () => {
        a.ontimeupdate = null;
        done(Number.isFinite(a.duration) ? a.duration : NaN);
      };
    };
    a.onerror = () => done(NaN);
    a.src = url;
  });
}

export function formatClock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
