// Snailpost's original brand geometry. Everything is generated from code so the
// same shapes render in the UI (inline SVG), the favicon (public/brand, via
// scripts/gen-brand.ts) and the printable PDF (pdf-lib drawSvgPath).
// Nothing here is traced from the moodboard; see docs/assets.md.

/** Deterministic PRNG (mulberry32) so "imperfect" shapes are identical on every render. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const f = (n: number) => Math.round(n * 100) / 100;

/**
 * A hand-drawn feeling spiral: Archimedean, opening outward, with a small
 * deterministic wobble. Returns an SVG path (stroke it, don't fill it).
 */
export function spiralPath(
  cx: number,
  cy: number,
  radius: number,
  turns = 2.4,
  wobble = 0.06,
  seed = 7,
) {
  const rnd = seeded(seed);
  const steps = Math.round(turns * 28);
  const maxT = turns * Math.PI * 2;
  const pts: [number, number][] = [];
  let drift = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxT;
    drift += (rnd() - 0.5) * wobble;
    drift *= 0.9;
    const r = radius * (t / maxT) * (1 + drift);
    // start at the centre, rotate so the open end sweeps toward lower right
    pts.push([cx + r * Math.cos(t + Math.PI), cy + r * Math.sin(t + Math.PI)]);
  }
  return smoothPath(pts);
}

/** Catmull-Rom → cubic Bézier through points, for an organic line. */
export function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * Postage-stamp outline: a rectangle whose edges have semicircular perforation
 * bites. Fill it; the bites read as the torn perforations of a real stamp.
 */
export function perforatedRect(w: number, h: number, bite = 2.2, pitch = 6.4) {
  const edge = (len: number) => {
    const n = Math.max(2, Math.round(len / pitch));
    return { n, step: len / n };
  };
  const top = edge(w);
  const side = edge(h);
  let d = `M0 0`;
  // top edge, left → right
  for (let i = 0; i < top.n; i++) {
    const mid = (i + 0.5) * top.step;
    d += ` L${f(mid - bite)} 0 A${bite} ${bite} 0 0 0 ${f(mid + bite)} 0`;
  }
  d += ` L${w} 0`;
  for (let i = 0; i < side.n; i++) {
    const mid = (i + 0.5) * side.step;
    d += ` L${w} ${f(mid - bite)} A${bite} ${bite} 0 0 0 ${w} ${f(mid + bite)}`;
  }
  d += ` L${w} ${h}`;
  for (let i = top.n - 1; i >= 0; i--) {
    const mid = (i + 0.5) * top.step;
    d += ` L${f(mid + bite)} ${h} A${bite} ${bite} 0 0 0 ${f(mid - bite)} ${h}`;
  }
  d += ` L0 ${h}`;
  for (let i = side.n - 1; i >= 0; i--) {
    const mid = (i + 0.5) * side.step;
    d += ` L0 ${f(mid + bite)} A${bite} ${bite} 0 0 0 0 ${f(mid - bite)}`;
  }
  return d + " Z";
}

/* ------------------------------------------------------------------ */
/* The snail mark: an envelope-shaped shell sealed with a spiral.      */
/* viewBox 0 0 64 64                                                   */
/* ------------------------------------------------------------------ */

export const MARK = {
  viewBox: "0 0 64 64",
  // foot: a soft slug of a body under the shell, head rising at right
  foot: "M5 53 C 5 49.5, 9 48.6, 14 48.6 L 45 48.6 C 48 48.6, 49 46, 49.3 42 L 49.8 33 C 50 27.5, 53 25.5, 55.5 25.5 C 58.5 25.5, 60.6 28, 60.6 33 L 60.6 45 C 60.6 51.5, 57 55.5, 50 55.5 L 9 55.6 C 6.5 55.6, 5 55, 5 53 Z",
  stalkA: "M52.6 27 C 51.6 22, 50 19.5, 47.6 17",
  stalkB: "M58.2 27 C 58.6 22, 59.6 19.5, 61.4 16.6",
  eyeA: { cx: 47, cy: 16.2, r: 2.1 },
  eyeB: { cx: 61.7, cy: 15.8, r: 2.1 },
  // shell: a slightly imperfect rounded envelope
  shell: "M10.5 21 C 10 17.5, 12 15.5, 15.5 15.3 L 42 14.8 C 45.6 14.8, 47.4 16.8, 47.3 20.4 L 47 43.5 C 47 46.5, 45.2 48.4, 42 48.4 L 15.4 48.6 C 12.4 48.6, 10.6 46.8, 10.6 43.6 Z",
  flap: "M12.5 18 C 18 23, 23 27.5, 28.8 31.6 C 34.6 27.4, 39.5 23, 45.2 17.6",
  sealDisc: { cx: 28.8, cy: 32.4, r: 9.6 },
  seal: spiralPath(28.8, 32.4, 6.6, 2.1, 0.05, 11),
};

export function markSvg({
  ink = "#2B2925",
  shell = "#F2C2AE",
  body = "#F2C2AE",
  seal = "#B54532",
} = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}" fill="none">
  <path d="${MARK.foot}" fill="${body}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="${MARK.stalkA}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="${MARK.stalkB}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="${MARK.eyeA.cx}" cy="${MARK.eyeA.cy}" r="${MARK.eyeA.r}" fill="${ink}"/>
  <circle cx="${MARK.eyeB.cx}" cy="${MARK.eyeB.cy}" r="${MARK.eyeB.r}" fill="${ink}"/>
  <path d="${MARK.shell}" fill="${shell}" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="${MARK.flap}" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${MARK.sealDisc.cx}" cy="${MARK.sealDisc.cy}" r="${MARK.sealDisc.r}" fill="${seal}" stroke="${ink}" stroke-width="1.6"/>
  <path d="${MARK.seal}" stroke="${shell === "#F2C2AE" ? "#FBF8F1" : shell}" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Stamps. Each represents a kind of moment, never a reward.           */
/* Artwork coordinates are within a 60 × 72 stamp.                     */
/* ------------------------------------------------------------------ */

export type StampId = "breakfast-club" | "on-my-way" | "little-victories" | "home-again";

export interface StampDef {
  id: StampId;
  name: string;
  /** what kind of moment it marks, shown as a hint in the picker */
  hint: string;
  paper: string;
  ink: string;
  art: { d: string; fill?: string; stroke?: string; width?: number }[];
}

export const STAMP_W = 60;
export const STAMP_H = 72;

export const STAMPS: StampDef[] = [
  {
    id: "breakfast-club",
    name: "Breakfast Club",
    hint: "for mornings and small meals",
    paper: "#F7E7B4",
    ink: "#2B2925",
    art: [
      // plate
      { d: "M14 36 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 Z", fill: "#FBF8F1", stroke: "#2B2925", width: 1.6 },
      // egg white, a lumpy cloud
      { d: "M20 35 C 19 28, 26 24, 31 26.5 C 36 23.5, 42.5 28, 40.5 33.5 C 44 38, 38.5 44.5, 32.5 42.5 C 27 46, 19.5 42.5, 21.5 38 C 19.6 37.6, 19.4 36, 20 35 Z", fill: "#FFFFFF", stroke: "#2B2925", width: 1.3 },
      // yolk
      { d: "M26.6 34.4 a4.6 4.6 0 1 0 9.2 0 a4.6 4.6 0 1 0 -9.2 0 Z", fill: "#D4A24A", stroke: "#2B2925", width: 1.2 },
      // steam curl
      { d: "M44 18 C 41 15.5, 46 13, 43.5 10 M48 19.5 C 45.5 17, 50 14.5, 47.5 11.5", stroke: "#B54532", width: 1.4 },
    ],
  },
  {
    id: "on-my-way",
    name: "On My Way",
    hint: "for walks, rides and the in-between",
    paper: "#DFE5D6",
    ink: "#2B2925",
    art: [
      // winding path
      { d: "M18 58 C 22 48, 40 46, 36 38 C 32 31, 22 30, 28 22", stroke: "#3D513E", width: 3.2 },
      // turning leaf
      { d: "M34 16 C 42 10, 50 14, 50 22 C 42 26, 35 23, 34 16 Z", fill: "#B54532", stroke: "#2B2925", width: 1.3 },
      { d: "M35 16.5 C 40 18, 45 19.5, 50 22", stroke: "#2B2925", width: 1 },
      // second leaf
      { d: "M12 30 C 13 23, 20 21, 24 25 C 21 31, 15 33, 12 30 Z", fill: "#D4A24A", stroke: "#2B2925", width: 1.2 },
    ],
  },
  {
    id: "little-victories",
    name: "Little Victories",
    hint: "for things that went a little right",
    paper: "#F2C2AE",
    ink: "#2B2925",
    art: [
      // a small hand-drawn pennant
      { d: "M22 58 L 22.6 16", stroke: "#2B2925", width: 2 },
      { d: "M22.8 16.5 C 30 16, 38 18.5, 45 22.5 C 38 26, 30 28.5, 22.6 29 Z", fill: "#B54532", stroke: "#2B2925", width: 1.4 },
      // sparkle
      { d: "M42 38 L 43.4 42.6 L 48 44 L 43.4 45.4 L 42 50 L 40.6 45.4 L 36 44 L 40.6 42.6 Z", fill: "#D4A24A", stroke: "#2B2925", width: 1.1 },
    ],
  },
  {
    id: "home-again",
    name: "Home Again",
    hint: "for evenings, dinners and coming back",
    paper: "#C9D3EA",
    ink: "#2B2925",
    art: [
      // house
      { d: "M15 34 L 30 20 L 45 34 L 45 54 L 15 54 Z", fill: "#FBF8F1", stroke: "#2B2925", width: 1.6 },
      // roof
      { d: "M11 36 L 30 17.5 L 49 36", stroke: "#2C4C9D", width: 3 },
      // lit window
      { d: "M24 39 h 12 v 9 h -12 Z", fill: "#D4A24A", stroke: "#2B2925", width: 1.2 },
      { d: "M30 39 v 9 M24 43.5 h 12", stroke: "#2B2925", width: 0.9 },
      // tiny moon
      { d: "M48 12 a5 5 0 1 0 4 8 a4 4 0 1 1 -4 -8 Z", fill: "#D4A24A", stroke: "#2B2925", width: 1 },
    ],
  },
];

export const stampById = (id: StampId) => STAMPS.find((s) => s.id === id) ?? STAMPS[0];

/* ------------------------------------------------------------------ */
/* Small ephemera                                                      */
/* ------------------------------------------------------------------ */

export const SPRIG = {
  viewBox: "0 0 40 60",
  stem: "M20 58 C 19 44, 21 30, 19 4",
  leaves: [
    "M19.6 44 C 12 42, 7 36, 8 30 C 15 31, 19 37, 19.6 44 Z",
    "M20.2 36 C 27 34, 32 28, 31 22 C 24 23, 20.5 29, 20.2 36 Z",
    "M19.4 26 C 13 24, 10 18, 11.5 13 C 17 15, 19.5 20, 19.4 26 Z",
    "M19.6 16 C 24 14, 26 10, 25 6 C 21 7, 19.4 11, 19.6 16 Z",
  ],
};

export const SUN = {
  viewBox: "0 0 48 48",
  disc: "M14 24 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z",
  rays: Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    const r1 = 14 + (i % 2) * 1.2;
    const r2 = 20.5 + (i % 3);
    return `M${f(24 + r1 * Math.cos(a))} ${f(24 + r1 * Math.sin(a))} L${f(24 + r2 * Math.cos(a))} ${f(24 + r2 * Math.sin(a))}`;
  }).join(" "),
};

export const STEAM = {
  viewBox: "0 0 24 40",
  d: "M12 38 C 4 31, 20 26, 12 19 C 5 13, 18 8, 13 2",
};

/** Wavy cancellation lines that sit beside a postmark. */
export function cancellationLines(x: number, y: number, w: number, gap = 5, n = 4) {
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const yy = y + i * gap;
    const amp = 1.6;
    const seg = w / 4;
    let d = `M${f(x)} ${f(yy)}`;
    for (let s = 0; s < 4; s++) {
      const x0 = x + s * seg;
      d += ` Q${f(x0 + seg / 4)} ${f(yy - amp)} ${f(x0 + seg / 2)} ${f(yy)} T${f(x0 + seg)} ${f(yy)}`;
    }
    lines.push(d);
  }
  return lines.join(" ");
}
