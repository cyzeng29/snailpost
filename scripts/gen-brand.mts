// Writes the static brand files in public/brand from src/lib/brand.ts.
// Run: node scripts/gen-brand.mts   (Node ≥ 22.18 strips TypeScript types natively)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MARK,
  STAMPS,
  STAMP_H,
  STAMP_W,
  markSvg,
  perforatedRect,
  spiralPath,
} from "../src/lib/brand.ts";

const out = join(import.meta.dirname, "..", "public", "brand");
mkdirSync(out, { recursive: true });

writeFileSync(join(out, "snail-mark.svg"), markSvg());

// Favicon variant: heavier strokes read better at 16px.
writeFileSync(
  join(out, "favicon.svg"),
  markSvg().replaceAll('stroke-width="2.2"', 'stroke-width="3.2"').replaceAll('stroke-width="2.6"', 'stroke-width="3.4"'),
);

// Paper grain: fractal noise at very low alpha, tiled behind content only.
writeFileSync(
  join(out, "grain.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix values="0 0 0 0 0.17  0 0 0 0 0.16  0 0 0 0 0.14  0 0 0 0.05 0"/></filter>
  <rect width="100%" height="100%" filter="url(#n)"/>
</svg>`,
);

for (const s of STAMPS) {
  const art = s.art
    .map(
      (a) =>
        `<path d="${a.d}" fill="${a.fill ?? "none"}" stroke="${a.stroke ?? "none"}" stroke-width="${a.width ?? 0}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("\n  ");
  writeFileSync(
    join(out, `stamp-${s.id}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${STAMP_W + 4} ${STAMP_H + 4}">
  <path d="${perforatedRect(STAMP_W, STAMP_H)}" fill="#FBF8F1" stroke="#2B2925" stroke-width="0.6"/>
  <rect x="4" y="4" width="${STAMP_W - 8}" height="${STAMP_H - 8}" fill="${s.paper}"/>
  ${art}
</svg>`,
  );
}

// A quiet envelope for the recipient's opening state.
writeFileSync(
  join(out, "envelope.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" fill="none">
  <path d="M8 22 C 8 14, 13 10, 21 10 L 219 9 C 227 9, 232 14, 232 22 L 231 140 C 231 147, 227 151, 219 151 L 21 152 C 13 152, 9 147, 9 140 Z" fill="#FBF8F1" stroke="#2B2925" stroke-width="2.4"/>
  <path d="M12 16 C 50 50, 85 76, 120 94 C 155 76, 190 50, 228 15" stroke="#2B2925" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M12 146 C 45 118, 70 102, 96 86 M228 146 C 195 118, 170 102, 144 86" stroke="#2B2925" stroke-width="1.4" stroke-linecap="round" opacity="0.5"/>
  <circle cx="120" cy="96" r="17" fill="#B54532"/>
  <path d="${spiralPath(120, 96, 11, 2.2, 0.05, 3)}" stroke="#FBF8F1" stroke-width="2.4" stroke-linecap="round"/>
</svg>`,
);

console.log("brand files written to", out, "| mark viewBox", MARK.viewBox);
