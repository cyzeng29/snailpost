// Printable postcard: a 6 × 4 in landscape PDF, front on page 1, back on page 2.
// A static print rendering path (vector type, embedded fonts and images), never
// a screenshot of the animated UI. Bound to one content snapshot.
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  clip,
  LineCapStyle,
  concatTransformationMatrix,
  degrees,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type Color,
} from "pdf-lib";
import QRCode from "qrcode";
import { MARK, STAMP_H, STAMP_W, cancellationLines, perforatedRect, stampById } from "./brand";
import { layoutFor } from "./layout";
import { formatDay, type PostcardContent } from "./model";

export const PT_PER_IN = 72;
export const PAGE_W = 6 * PT_PER_IN; // 432
export const PAGE_H = 4 * PT_PER_IN; // 288
export const SAFE = 0.25 * PT_PER_IN; // 18pt safe margin
const CQ = PAGE_W / 100; // one "cqw" of the on-screen card, in points

const hex = (h: string): Color => {
  const n = parseInt(h.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const INK = hex("#2B2925");
const INK_SOFT = hex("#5C564D");
const CREAM = hex("#FBF8F1");
const CLAY_DEEP = hex("#9A3826");
const BLUE = hex("#2C4C9D");

export interface PdfAssets {
  /** fetch bytes for a URL (fonts, photos) */
  fetchBytes: (url: string) => Promise<Uint8Array>;
  /** convert a non-JPEG/PNG image to JPEG bytes (browser canvas); optional in tests */
  toJpeg?: (url: string) => Promise<Uint8Array>;
  fontBase?: string;
}

export interface PdfReport {
  pageCount: number;
  continuation: boolean;
  qrUrl?: string;
  lowResolution: string[];
}

/** Only real, public https links may be printed as a QR code. */
export function isPrintableShareUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(u.hostname) || u.hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

/** Greedy word wrap using real font metrics. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) line = trial;
      else {
        if (line) lines.push(line);
        // break very long words rather than overflowing
        let word = w;
        while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
          let cut = word.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
          lines.push(word.slice(0, cut));
          word = word.slice(cut);
        }
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function isJpeg(b: Uint8Array) {
  return b[0] === 0xff && b[1] === 0xd8;
}
function isPng(b: Uint8Array) {
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

/** pdf-lib's y axis points up; the card layout is written top-down like CSS. */
const yTop = (top: number, height = 0) => PAGE_H - top - height;

function drawCover(page: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number, rotateDeg = 0) {
  const scale = Math.max(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = (rotateDeg * Math.PI) / 180;
  page.pushOperators(
    pushGraphicsState(),
    // rotate about the frame centre (CSS rotates clockwise; PDF counter-clockwise)
    concatTransformationMatrix(1, 0, 0, 1, cx, cy),
    concatTransformationMatrix(Math.cos(-r), Math.sin(-r), -Math.sin(-r), Math.cos(-r), 0, 0),
    concatTransformationMatrix(1, 0, 0, 1, -cx, -cy),
    rectangle(x, y, w, h),
    clip(),
    endPath(),
  );
  page.drawImage(img, { x: cx - iw / 2, y: cy - ih / 2, width: iw, height: ih });
  page.pushOperators(popGraphicsState());
}

function drawRotatedRect(page: PDFPage, x: number, y: number, w: number, h: number, rotateDeg: number, color: Color) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = (-rotateDeg * Math.PI) / 180;
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(1, 0, 0, 1, cx, cy),
    concatTransformationMatrix(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0),
    concatTransformationMatrix(1, 0, 0, 1, -cx, -cy),
  );
  page.drawRectangle({ x, y, width: w, height: h, color });
  page.pushOperators(popGraphicsState());
}

function drawMark(page: PDFPage, x: number, top: number, size: number) {
  const s = size / 64;
  const at = { x, y: PAGE_H - top, scale: s };
  page.drawSvgPath(MARK.foot, { ...at, color: hex("#F2C2AE"), borderColor: INK, borderWidth: 2.6 * s });
  page.drawSvgPath(MARK.stalkA, { ...at, borderColor: INK, borderWidth: 2.6 * s });
  page.drawSvgPath(MARK.stalkB, { ...at, borderColor: INK, borderWidth: 2.6 * s });
  page.drawSvgPath(MARK.shell, { ...at, color: hex("#F2C2AE"), borderColor: INK, borderWidth: 2.8 * s });
  page.drawSvgPath(MARK.flap, { ...at, borderColor: INK, borderWidth: 2.2 * s });
  const d = MARK.sealDisc;
  page.drawCircle({ x: x + d.cx * s, y: PAGE_H - top - d.cy * s, size: d.r * s, color: hex("#B54532"), borderColor: INK, borderWidth: 1.6 * s });
  page.drawSvgPath(MARK.seal, { ...at, borderColor: CREAM, borderWidth: 2.4 * s });
}

function drawStamp(page: PDFPage, id: PostcardContent["stamp"], left: number, top: number, width: number) {
  const s = width / STAMP_W;
  const def = stampById(id);
  const at = { x: left, y: PAGE_H - top, scale: s };
  page.drawSvgPath(perforatedRect(STAMP_W, STAMP_H), { ...at, color: CREAM, borderColor: INK, borderWidth: 0.6 * s });
  page.drawRectangle({ x: left + 4 * s, y: PAGE_H - top - (STAMP_H - 4) * s, width: (STAMP_W - 8) * s, height: (STAMP_H - 8) * s, color: hex(def.paper) });
  for (const a of def.art) {
    page.drawSvgPath(a.d, {
      ...at,
      color: a.fill ? hex(a.fill) : undefined,
      borderColor: a.stroke ? hex(a.stroke) : undefined,
      borderWidth: a.stroke ? (a.width ?? 1) * s : 0,
      borderLineCap: LineCapStyle.Round,
    });
  }
}

export async function buildPostcardPdf(
  content: PostcardContent,
  assets: PdfAssets,
  opts: { shareUrl?: string } = {},
): Promise<{ bytes: Uint8Array; report: PdfReport }> {
  const base = assets.fontBase ?? "/fonts";
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(content.title || "A postcard");
  doc.setAuthor(content.senderName || "snailpost");
  doc.setSubject("Print at actual size (100%). For two-sided printing, flip on the short edge and check alignment.");
  doc.setCreator("snailpost");
  doc.setProducer("snailpost (pdf-lib)");

  const [display, serif, sans, sansBold, hand] = await Promise.all(
    [
      "Fraunces72ptSoft-SemiBold.ttf",
      "Fraunces9ptSoft-Regular.ttf",
      "AtkinsonHyperlegible-Regular.ttf",
      "AtkinsonHyperlegible-Bold.ttf",
      "Caveat.ttf",
    ].map(async (f) => doc.embedFont(await assets.fetchBytes(`${base}/${f}`), { subset: true })),
  );

  const report: PdfReport = { pageCount: 2, continuation: false, lowResolution: [] };

  /* ---------------- page 1: front ---------------- */
  const front = doc.addPage([PAGE_W, PAGE_H]);
  front.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });

  const layout = layoutFor(content.moments.map((m) => m.id));
  const hero = layout.kind === "hero";
  const area = { left: SAFE, top: SAFE, width: PAGE_W - 2 * SAFE, height: (hero ? 47.5 : 46) * CQ };

  for (let i = 0; i < content.moments.length; i++) {
    const m = content.moments[i];
    const fr = layout.frames[i];
    let bytes = await assets.fetchBytes(m.src);
    if (!isJpeg(bytes) && !isPng(bytes)) {
      if (!assets.toJpeg) throw new Error(`Unsupported image for print: ${m.id}`);
      bytes = await assets.toJpeg(m.src);
    }
    const img = isPng(bytes) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const w = (fr.w / 100) * area.width;
    const h = (fr.h / 100) * area.height;
    const x = area.left + (fr.x / 100) * area.width;
    const y = yTop(area.top + (fr.y / 100) * area.height, h);
    const border = hero ? 0 : 0.7 * CQ;
    if (!hero) drawRotatedRect(front, x, y, w, h, fr.rotate, rgb(1, 1, 1));
    drawCover(front, img, x + border, y + border, w - 2 * border, h - 2 * border, fr.rotate);
    // print sharpness: the frame at 300 dpi vs the pixels we have
    const needPx = ((w - 2 * border) / PT_PER_IN) * 300;
    const havePx = img.width * Math.max(1, (h / w) * (img.width / img.height));
    if (havePx < needPx * 0.6) report.lowResolution.push(m.id);
  }

  // title strip
  const stripBottom = SAFE - 2;
  const title = content.title.trim() || "A little of my day";
  const maxTitleW = PAGE_W - 2 * SAFE - 26 * CQ;
  let titleSize = 4.6 * CQ;
  let titleLines = wrapText(title, display, titleSize, maxTitleW);
  if (titleLines.length > 1) {
    titleSize = 3.6 * CQ;
    titleLines = wrapText(title, display, titleSize, maxTitleW);
  }
  const dateLine = (formatDay(content.day) + (content.fromPlace ? ` · ${content.fromPlace}` : "")).toUpperCase();
  const dateSize = 1.9 * CQ;
  front.drawText(dateLine, { x: SAFE + 2, y: stripBottom + 2, size: dateSize, font: sansBold, color: INK_SOFT});
  titleLines.slice(0, 2).forEach((ln, i, arr) => {
    front.drawText(ln, { x: SAFE + 2, y: stripBottom + dateSize + 7 + (arr.length - 1 - i) * titleSize * 1.05, size: titleSize, font: display, color: INK });
  });
  if (content.senderName.trim()) {
    const sig = `— ${content.senderName.trim()}`;
    const sigSize = 4.4 * CQ;
    const sw = hand.widthOfTextAtSize(sig, sigSize);
    front.drawText(sig, { x: PAGE_W - SAFE - sw, y: stripBottom + 4, size: sigSize, font: hand, color: CLAY_DEEP, rotate: degrees(4) });
  }

  /* ---------------- page 2: back ---------------- */
  const back = doc.addPage([PAGE_W, PAGE_H]);
  back.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });
  const to = content.recipientName.trim() || "you";
  const from = content.senderName.trim() || "me";
  const msgLeft = SAFE + 2;
  const msgWidth = 48 * CQ;
  const greetSize = 3.6 * CQ;
  back.drawText(`Dear ${to},`, { x: msgLeft, y: yTop(SAFE + 2, greetSize), size: greetSize, font: display, color: INK });

  const noteSize = 2.85 * CQ;
  const lead = noteSize * 1.42;
  const noteTop = SAFE + 2 + greetSize + 8;
  const signSize = 4.4 * CQ;
  const noteBottomLimit = PAGE_H - SAFE - signSize - 8; // keep room for "Love,"
  const lines = wrapText(content.note.trim(), serif, noteSize, msgWidth);
  const fit = Math.floor((noteBottomLimit - noteTop) / lead);
  let shown = lines;
  let overflow: string[] = [];
  if (lines.length > fit) {
    shown = lines.slice(0, fit - 1);
    overflow = lines.slice(fit - 1);
    report.continuation = true;
  }
  shown.forEach((ln, i) => back.drawText(ln, { x: msgLeft, y: yTop(noteTop + i * lead, noteSize), size: noteSize, font: serif, color: INK }));
  if (report.continuation) {
    back.drawText("(continued on the next page)", { x: msgLeft, y: yTop(noteTop + shown.length * lead, noteSize), size: noteSize * 0.9, font: sans, color: INK_SOFT });
  }
  back.drawText(`Love, ${from}`, { x: msgLeft, y: SAFE, size: signSize, font: hand, color: CLAY_DEEP });

  // postal divider
  back.drawLine({ start: { x: 57 * CQ, y: SAFE + 6 }, end: { x: 57 * CQ, y: PAGE_H - SAFE - 6 }, thickness: 0.8, color: INK, opacity: 0.4 });

  // stamp + postmark
  const stampW = 11.5 * CQ;
  drawStamp(back, content.stamp, PAGE_W - SAFE - stampW, SAFE, stampW);
  const pmCx = PAGE_W - SAFE - stampW - 4 * CQ;
  const pmCy = PAGE_H - SAFE - 12 * CQ;
  back.drawCircle({ x: pmCx, y: pmCy, size: 7 * CQ, borderColor: BLUE, borderWidth: 1, opacity: 0, borderOpacity: 0.75 });
  back.drawCircle({ x: pmCx, y: pmCy, size: 4 * CQ, borderColor: BLUE, borderWidth: 0.8, opacity: 0, borderOpacity: 0.75 });
  const place = (content.fromPlace?.trim() || "snailpost").toUpperCase().slice(0, 14);
  const [yy, mm, dd] = content.day.split("-").map(Number);
  const mon = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(yy, mm - 1, dd))).toUpperCase();
  const pmSmall = 1.45 * CQ;
  back.drawText(place, { x: pmCx - sansBold.widthOfTextAtSize(place, pmSmall) / 2, y: pmCy + 4.6 * CQ, size: pmSmall, font: sansBold, color: BLUE, opacity: 0.85 });
  const dl = `${mon} ${dd}`;
  back.drawText(dl, { x: pmCx - sansBold.widthOfTextAtSize(dl, 1.8 * CQ) / 2, y: pmCy - 0.7 * CQ, size: 1.8 * CQ, font: sansBold, color: BLUE, opacity: 0.85 });
  back.drawSvgPath(cancellationLines(0, 0, 15 * CQ, 1.8 * CQ, 4), { x: pmCx - 22 * CQ, y: pmCy + 3 * CQ, borderColor: BLUE, borderWidth: 0.8, borderOpacity: 0.7 });

  // address lines
  const addrLeft = 61 * CQ;
  const addrRight = PAGE_W - SAFE;
  const addr = [`To ${to}`, content.toPlace ?? "", content.fromPlace ? `from ${content.fromPlace}` : ""];
  addr.forEach((line, i) => {
    const baseY = yTop(30 * CQ + (i + 1) * 5.2 * CQ);
    if (line) back.drawText(line, { x: addrLeft, y: baseY + 3, size: 2.5 * CQ, font: sans, color: INK });
    back.drawLine({ start: { x: addrLeft, y: baseY }, end: { x: addrRight, y: baseY }, thickness: 0.6, color: INK, opacity: 0.45 });
  });

  // optional QR: only for a real public link, only when there's a voice to hear
  if (content.voice && isPrintableShareUrl(opts.shareUrl)) {
    const png = await QRCode.toBuffer(opts.shareUrl, { errorCorrectionLevel: "M", margin: 1, width: 360, color: { dark: "#2B2925", light: "#FBF8F1" } });
    const qr = await doc.embedPng(new Uint8Array(png));
    const qs = 0.78 * PT_PER_IN;
    back.drawImage(qr, { x: addrLeft, y: SAFE, width: qs, height: qs });
    back.drawText("Scan to hear my day.", { x: addrLeft + qs + 6, y: SAFE + qs / 2 + 2, size: 2 * CQ, font: sansBold, color: INK });
    back.drawText("Opens this unlisted postcard.", { x: addrLeft + qs + 6, y: SAFE + qs / 2 - 9, size: 1.6 * CQ, font: sans, color: INK_SOFT });
    report.qrUrl = opts.shareUrl;
  } else {
    drawMark(back, addrLeft, PAGE_H - SAFE - 3.4 * CQ, 3.4 * CQ);
    back.drawText("snailpost", { x: addrLeft + 4.2 * CQ, y: SAFE + 2, size: 1.7 * CQ, font: sans, color: INK_SOFT });
  }

  /* ---------------- continuation (only for overlong content) ---------------- */
  if (overflow.length) {
    const cont = doc.addPage([PAGE_W, PAGE_H]);
    cont.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });
    cont.drawText("Continued from the back", { x: SAFE, y: yTop(SAFE, 10), size: 10, font: sansBold, color: INK_SOFT });
    const all = wrapText(overflow.join(" "), serif, noteSize, PAGE_W - 2 * SAFE);
    all.forEach((ln, i) => cont.drawText(ln, { x: SAFE, y: yTop(SAFE + 22 + i * lead, noteSize), size: noteSize, font: serif, color: INK }));
    report.pageCount = 3;
  }

  const bytes = await doc.save();
  return { bytes, report };
}
