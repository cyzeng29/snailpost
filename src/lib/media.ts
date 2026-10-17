// Photo intake: validate, decode (respecting camera orientation), resize, and
// re-encode as JPEG. Re-encoding through a canvas drops EXIF, including GPS
// location, so processed photos carry no location metadata.

export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export const MAX_EDGE = 2400;
/** Below this short edge, a 6×4 in print at 300 dpi will look soft. */
export const PRINT_MIN_SHORT_EDGE = 1200;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const HEIC = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

export type ImageProblem = "too-large" | "unsupported" | "heic" | "corrupt" | "empty";

export class ImageIntakeError extends Error {
  constructor(
    public problem: ImageProblem,
    message: string,
  ) {
    super(message);
  }
}

export const IMAGE_MESSAGES: Record<ImageProblem, string> = {
  "too-large": "That photo is over 30 MB. Try a smaller copy, or a screenshot of it.",
  unsupported: "That file isn't a photo this app can use. JPEG, PNG, WebP and GIF all work.",
  heic:
    "This browser can't open HEIC photos. On iPhone, choose the photo from your library here and it will usually convert automatically, or set Camera › Formats to “Most Compatible”.",
  corrupt: "That photo couldn't be opened. It may be damaged or only partly downloaded. Try another copy.",
  empty: "That file is empty. Try choosing the photo again.",
};

export function isHeic(file: { type: string; name: string }) {
  return HEIC.includes(file.type.toLowerCase()) || /\.(heic|heif)$/i.test(file.name);
}

/** Cheap checks before decoding. Pure, so it is unit-tested. */
export function precheckImage(file: { type: string; name: string; size: number }): ImageProblem | null {
  if (file.size === 0) return "empty";
  if (file.size > MAX_IMAGE_BYTES) return "too-large";
  if (isHeic(file)) return null; // decided by whether this browser can decode it
  const type = file.type.toLowerCase();
  if (type && !ACCEPTED.includes(type)) return "unsupported";
  if (!type && !/\.(jpe?g|png|webp|gif|avif)$/i.test(file.name)) return "unsupported";
  return null;
}

export function fitWithin(w: number, h: number, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  /** too small to print sharply at 6×4 in */
  lowResolution: boolean;
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img>, which some engines decode more leniently
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const problem = precheckImage(file);
  if (problem) throw new ImageIntakeError(problem, IMAGE_MESSAGES[problem]);

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    const p: ImageProblem = isHeic(file) ? "heic" : "corrupt";
    throw new ImageIntakeError(p, IMAGE_MESSAGES[p]);
  }
  const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
  const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!sw || !sh) throw new ImageIntakeError("corrupt", IMAGE_MESSAGES.corrupt);

  const { width, height } = fitWithin(sw, sh);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageIntakeError("corrupt", IMAGE_MESSAGES.corrupt);
  ctx.fillStyle = "#ffffff"; // transparent PNGs print on white, not black
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.88));
  if (!blob) throw new ImageIntakeError("corrupt", IMAGE_MESSAGES.corrupt);
  return { blob, width, height, lowResolution: Math.min(sw, sh) < PRINT_MIN_SHORT_EDGE };
}

/** Accept attribute for inputs; HEIC is listed so iOS offers its own conversion. */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif";
