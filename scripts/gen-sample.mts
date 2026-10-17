// Generates the four original illustrations for the fictional sample story
// (Alex → Grandma) as SVG, then rasterises them to JPEG with Playwright so the
// sample behaves exactly like real photos (same layout, same PDF path).
// Run: node scripts/gen-sample.mts
// These are original artwork made for Snailpost; see docs/assets.md.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1600;
let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const H = 1200;
const out = join(import.meta.dirname, "..", "public", "sample");
mkdirSync(out, { recursive: true });

// Shared gouache finish: paper grain + soft light falloff.
const finish = (light = "#FFF6DF") => `
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4" result="n"/>
      <feColorMatrix in="n" values="0 0 0 0 0.16  0 0 0 0 0.13  0 0 0 0 0.1  0 0 0 0.16 0"/>
    </filter>
    <filter id="wobble"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
    <radialGradient id="light" cx="0.35" cy="0.25" r="0.9">
      <stop offset="0" stop-color="${light}" stop-opacity="0.35"/>
      <stop offset="0.6" stop-color="${light}" stop-opacity="0"/>
      <stop offset="1" stop-color="#1b140e" stop-opacity="0.28"/>
    </radialGradient>
  </defs>`;
const overlay = `<rect width="${W}" height="${H}" fill="url(#light)"/><rect width="${W}" height="${H}" filter="url(#grain)"/>`;

const scenes: Record<string, string> = {
  // 1. Breakfast — top-down table, plate of eggs, tea, morning window light
  breakfast: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${finish()}
  <rect width="${W}" height="${H}" fill="#B98A57"/>
  <g opacity="0.35" stroke="#8C5F33" stroke-width="6" fill="none">
    ${Array.from({ length: 14 }, (_, i) => `<path d="M-20 ${60 + i * 88} C 400 ${40 + i * 88}, 900 ${100 + i * 88}, 1640 ${70 + i * 88}"/>`).join("")}
  </g>
  <g filter="url(#wobble)">
    <path d="M0 0 L 620 0 L 1000 1200 L 0 1200 Z" fill="#FFF3D6" opacity="0.18"/>
    <ellipse cx="700" cy="640" rx="420" ry="400" fill="#3a2a1c" opacity="0.18"/>
    <circle cx="680" cy="610" r="400" fill="#F4EEE2"/>
    <circle cx="680" cy="610" r="330" fill="none" stroke="#D9CDB7" stroke-width="10"/>
    <path d="M470 560 C 440 430, 580 360, 660 420 C 740 360, 860 440, 820 540 C 880 620, 790 720, 690 690 C 600 760, 470 700, 500 620 C 460 610, 455 580, 470 560 Z" fill="#FFFFFF"/>
    <circle cx="650" cy="555" r="74" fill="#E9A92E"/>
    <circle cx="628" cy="530" r="20" fill="#F7D27A" opacity="0.8"/>
    <path d="M660 700 C 640 640, 760 600, 820 650 C 900 640, 950 720, 900 790 C 930 860, 840 900, 780 860 C 700 900, 620 840, 660 790 C 620 760, 630 720, 660 700 Z" fill="#FFFFFF"/>
    <circle cx="790" cy="760" r="66" fill="#E59E22"/>
    <path d="M500 820 l 120 -40 l 18 60 l -120 40 Z" fill="#3D513E" opacity="0.9"/>
    <rect x="1080" y="140" width="330" height="270" rx="40" fill="#D9A15B" transform="rotate(12 1245 275)"/>
    <rect x="1100" y="160" width="290" height="230" rx="34" fill="#EFC27D" transform="rotate(12 1245 275)"/>
    <circle cx="1260" cy="820" r="190" fill="#2C4C9D"/>
    <circle cx="1260" cy="820" r="150" fill="#7B4A23"/>
    <circle cx="1225" cy="785" r="40" fill="#A8703D" opacity="0.6"/>
    <path d="M1440 760 C 1530 760, 1540 880, 1440 880" fill="none" stroke="#2C4C9D" stroke-width="40" stroke-linecap="round"/>
    <path d="M240 900 L 360 360" stroke="#D8D2C6" stroke-width="26" stroke-linecap="round"/>
    <path d="M330 380 l 20 -110 M360 384 l 14 -110 M300 374 l 26 -108" stroke="#D8D2C6" stroke-width="12" stroke-linecap="round"/>
  </g>
  <g opacity="0.22" fill="#FFF6DF"><path d="M0 0 L 260 0 L 760 1200 L 420 1200 Z"/><path d="M380 0 L 520 0 L 1060 1200 L 900 1200 Z"/></g>
  ${overlay}</svg>`,

  // 2. The walk to class — path under turning trees
  walk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${finish("#FFE9B8")}
  <rect width="${W}" height="${H}" fill="#F3E3B8"/>
  <rect y="0" width="${W}" height="560" fill="#F6E9C4"/>
  <g filter="url(#wobble)">
    <path d="M0 520 C 300 480, 600 540, 900 500 C 1200 470, 1400 520, 1600 500 L 1600 1200 L 0 1200 Z" fill="#7E8C5A"/>
    <path d="M700 520 C 760 520, 840 520, 900 520 L 1400 1200 L 200 1200 Z" fill="#CBB48E"/>
    <path d="M760 520 L 840 520 L 1080 1200 L 560 1200 Z" fill="#D9C5A0" opacity="0.6"/>
    ${[
      [150, 300, 260, "#C2542F"], [420, 360, 200, "#D98B2B"], [610, 420, 130, "#B54532"],
      [1050, 420, 130, "#D4A24A"], [1250, 340, 210, "#C2542F"], [1480, 280, 260, "#E0A33A"],
    ]
      .map(([x, y, r, c]) => `<rect x="${(x as number) - 14}" y="${y}" width="28" height="${(r as number) * 1.9}" fill="#4A3424"/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>
      <circle cx="${(x as number) - (r as number) * 0.35}" cy="${(y as number) - (r as number) * 0.3}" r="${(r as number) * 0.55}" fill="#fff" opacity="0.12"/>`)
      .join("")}
    ${Array.from({ length: 70 }, (_, i) => {
      const x = 20 + rnd() * 1560;
      const y = 600 + Math.pow(rnd(), 0.7) * 580;
      const c = ["#C2542F", "#D98B2B", "#B54532", "#E0A33A"][i % 4];
      return `<ellipse cx="${x}" cy="${y}" rx="16" ry="8" fill="${c}" transform="rotate(${(i * 37) % 180} ${x} ${y})"/>`;
    }).join("")}
    <rect x="1170" y="430" width="14" height="300" fill="#2B2925"/>
    <circle cx="1177" cy="425" r="22" fill="#F7E7B4" stroke="#2B2925" stroke-width="8"/>
  </g>
  ${overlay}</svg>`,

  // 3. Practice — a field at golden hour, long shadows
  practice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${finish("#FFD9A0")}
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B07A"/><stop offset="1" stop-color="#F7D9A6"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <g filter="url(#wobble)">
    <circle cx="1180" cy="470" r="110" fill="#FBE7B5"/>
    <path d="M0 500 C 200 440, 380 470, 560 450 C 760 430, 900 470, 1100 450 C 1300 430, 1450 460, 1600 450 L 1600 600 L 0 600 Z" fill="#5F6B45"/>
    <rect y="560" width="${W}" height="640" fill="#6E8A4A"/>
    ${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${620 + i * 110} L ${W} ${600 + i * 110} L ${W} ${655 + i * 110} L 0 ${675 + i * 110} Z" fill="#7E9A55" opacity="${0.5 - i * 0.05}"/>`).join("")}
    <path d="M100 1150 C 500 900, 1100 900, 1500 1150" fill="none" stroke="#F6F1E7" stroke-width="12" opacity="0.85"/>
    <path d="M800 560 L 800 1200" stroke="#F6F1E7" stroke-width="10" opacity="0.7"/>
    <g stroke="#F6F1E7" stroke-width="16" fill="none" stroke-linecap="round">
      <path d="M260 700 L 260 470 L 560 470 L 560 700"/>
    </g>
    <g stroke="#F6F1E7" stroke-width="2.5" opacity="0.6">
      ${Array.from({ length: 13 }, (_, i) => `<path d="M${270 + i * 23} 475 L ${300 + i * 23} 640"/>`).join("")}
      ${Array.from({ length: 7 }, (_, i) => `<path d="M262 ${490 + i * 28} L 558 ${490 + i * 28}"/>`).join("")}
    </g>
    <path d="M260 700 L -60 980 M560 700 L 260 1000" stroke="#3E5230" stroke-width="18" opacity="0.4"/>
    <circle cx="1010" cy="880" r="46" fill="#FBF8F1"/>
    <path d="M990 850 l 26 14 l -6 30 l -28 -6 Z" fill="#2B2925" opacity="0.8"/>
    <ellipse cx="900" cy="935" rx="150" ry="18" fill="#3E5230" opacity="0.45"/>
    <path d="M1300 640 l 16 -40 l 16 40 Z" fill="#E07B2E"/>
    <path d="M1360 660 l 16 -40 l 16 40 Z" fill="#E07B2E"/>
  </g>
  ${overlay}</svg>`,

  // 4. Dinner — shared table from above, warm lamplight
  dinner: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${finish("#FFE2A8")}
  <rect width="${W}" height="${H}" fill="#3B2B22"/>
  <g filter="url(#wobble)">
    <circle cx="800" cy="600" r="640" fill="#3D513E"/>
    <circle cx="800" cy="600" r="600" fill="#4A6049"/>
    <circle cx="800" cy="600" r="210" fill="#F4EEE2"/>
    <circle cx="800" cy="600" r="170" fill="#C0602D"/>
    ${Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return `<ellipse cx="${800 + Math.cos(a) * 95}" cy="${600 + Math.sin(a) * 95}" rx="38" ry="22" fill="#E59B4A" transform="rotate(${(a * 180) / Math.PI} ${800 + Math.cos(a) * 95} ${600 + Math.sin(a) * 95})"/>`;
    }).join("")}
    <circle cx="800" cy="600" r="55" fill="#7E9A55"/>
    ${[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = 800 + Math.cos(a) * 420;
      const y = 600 + Math.sin(a) * 420;
      return `<circle cx="${x}" cy="${y}" r="105" fill="#F4EEE2"/><circle cx="${x}" cy="${y}" r="80" fill="#FFFDF7"/>
      <circle cx="${x - 20}" cy="${y - 18}" r="40" fill="#F1E9D6"/>
      <path d="M${x + 120} ${y - 60} l 30 140 M${x + 140} ${y - 64} l 30 140" stroke="#2B2925" stroke-width="9" stroke-linecap="round"/>
      <circle cx="${x - 150}" cy="${y + 70}" r="38" fill="#D4A24A" opacity="0.75"/>`;
    }).join("")}
  </g>
  <circle cx="800" cy="560" r="760" fill="#FFD48A" opacity="0.12"/>
  ${overlay}</svg>`,
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [name, svg] of Object.entries(scenes)) {
  writeFileSync(join(out, `${name}.svg`), svg);
  await page.setContent(`<html><body style="margin:0">${svg.replace("<svg ", `<svg width="${W}" height="${H}" `)}</body></html>`);
  await page.screenshot({ path: join(out, `${name}.jpg`), type: "jpeg", quality: 86 });
}
await browser.close();
console.log("sample illustrations written to", out);
