// Deterministic postcard layout. Given the moments in the sender's order, it
// returns where each photo sits on the front. No randomness at render time:
// small "hand-placed" rotations are derived from each moment's id.
import { hashString } from "./brand";

export type LayoutKind = "hero" | "pair" | "trio" | "grid" | "sequence";

export interface Frame {
  /** percentages of the photo area */
  x: number;
  y: number;
  w: number;
  h: number;
  /** degrees */
  rotate: number;
}

export interface Layout {
  kind: LayoutKind;
  frames: Frame[];
}

/** Stable small rotation in [-max, max], from an id. */
export function tilt(id: string, max = 2.5) {
  const h = hashString(id);
  return Math.round((((h % 1000) / 1000) * 2 - 1) * max * 10) / 10;
}

export function layoutFor(ids: string[]): Layout {
  const n = ids.length;
  const t = (i: number, max?: number) => tilt(ids[i], max);
  if (n <= 1) return { kind: "hero", frames: [{ x: 0, y: 0, w: 100, h: 100, rotate: 0 }] };
  if (n === 2)
    return {
      kind: "pair",
      frames: [
        { x: 1, y: 4, w: 48, h: 92, rotate: t(0) },
        { x: 51, y: 4, w: 48, h: 92, rotate: t(1) },
      ],
    };
  if (n === 3)
    return {
      kind: "trio",
      frames: [
        { x: 0, y: 0, w: 58, h: 100, rotate: 0 },
        { x: 61, y: 0, w: 39, h: 48.5, rotate: t(1, 1.5) },
        { x: 61, y: 51.5, w: 39, h: 48.5, rotate: t(2, 1.5) },
      ],
    };
  if (n === 4)
    return {
      kind: "grid",
      frames: [
        { x: 0, y: 0, w: 49, h: 48.5, rotate: t(0, 1.2) },
        { x: 51, y: 0, w: 49, h: 48.5, rotate: t(1, 1.2) },
        { x: 0, y: 51.5, w: 49, h: 48.5, rotate: t(2, 1.2) },
        { x: 51, y: 51.5, w: 49, h: 48.5, rotate: t(3, 1.2) },
      ],
    };
  // 5–6: a clean sequence read left to right, top to bottom
  const cols = 3;
  const rows = 2;
  const gap = 2;
  const w = (100 - gap * (cols - 1)) / cols;
  const h = (100 - gap * (rows - 1)) / rows;
  const frames: Frame[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const inRow = row === 0 ? Math.min(cols, n) : n - cols;
    const col = i % cols;
    // centre a short second row (five moments → 3 + 2)
    const offset = ((cols - inRow) * (w + gap)) / 2;
    frames.push({ x: offset + col * (w + gap), y: row * (h + gap), w, h, rotate: 0 });
  }
  return { kind: "sequence", frames };
}
