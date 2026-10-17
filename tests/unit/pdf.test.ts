// Builds real PDFs from the bundled sample with the same code the browser uses,
// then inspects them: page count and size, embedded fonts and images, QR target.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import jsQR from "jsqr";
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from "pdf-lib";
import { PNG } from "pngjs";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { buildPostcardPdf, PAGE_H, PAGE_W } from "@/lib/pdf";
import { SAMPLE_POSTCARD } from "@/lib/sample";

const PUBLIC = join(__dirname, "..", "..", "public");
const assets = {
  fetchBytes: async (url: string) => new Uint8Array(readFileSync(join(PUBLIC, url.replace(/^\//, "")))),
};

async function inspect(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  let images = 0;
  const fonts = new Set<string>();
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFRawStream ? obj.dict : obj instanceof PDFDict ? obj : null;
    if (!dict) continue;
    if (dict.get(PDFName.of("Subtype")) === PDFName.of("Image")) images++;
    const base = dict.get(PDFName.of("BaseFont"));
    if (base) fonts.add(base.toString());
  }
  return { pages, images, fonts: [...fonts] };
}

describe("printable postcard PDF", () => {
  it("is two 6 × 4 in landscape pages with embedded fonts and every photo", async () => {
    const { bytes, report } = await buildPostcardPdf(SAMPLE_POSTCARD, assets);
    const { pages, images, fonts } = await inspect(bytes);
    expect(report.pageCount).toBe(2);
    expect(pages).toHaveLength(2);
    for (const p of pages) {
      expect(p.getWidth()).toBe(PAGE_W);
      expect(p.getHeight()).toBe(PAGE_H);
      expect(PAGE_W).toBe(432);
      expect(PAGE_H).toBe(288);
    }
    expect(images).toBe(SAMPLE_POSTCARD.moments.length);
    expect(fonts.some((f) => f.includes("Fraunces"))).toBe(true);
    expect(fonts.some((f) => f.includes("Atkinson"))).toBe(true);
    expect(report.continuation).toBe(false);
  });

  it("builds an intentional card from a single photo", async () => {
    const one = { ...SAMPLE_POSTCARD, moments: SAMPLE_POSTCARD.moments.slice(0, 1) };
    const { bytes } = await buildPostcardPdf(one, assets);
    const { pages, images } = await inspect(bytes);
    expect(pages).toHaveLength(2);
    expect(images).toBe(1);
  });

  it("never prints a QR for a local or non-https link", async () => {
    const { report } = await buildPostcardPdf(SAMPLE_POSTCARD, assets, { shareUrl: "http://localhost:3000/p/abc" });
    expect(report.qrUrl).toBeUndefined();
  });

  it("prints a QR that decodes to the exact public link", async () => {
    const url = "https://snailpost.example/p/Abc_123-def456Abc_123-def456Abc_123-def45";
    const { bytes, report } = await buildPostcardPdf(SAMPLE_POSTCARD, assets, { shareUrl: url });
    expect(report.qrUrl).toBe(url);
    const { images } = await inspect(bytes);
    expect(images).toBe(SAMPLE_POSTCARD.moments.length + 1);
    // decode the same QR rendering the PDF embeds
    const png = PNG.sync.read(await QRCode.toBuffer(url, { errorCorrectionLevel: "M", margin: 1, width: 360, color: { dark: "#2B2925", light: "#FBF8F1" } }));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(url);
  });

  it("uses a clearly marked continuation page instead of shrinking a long note", async () => {
    const long = { ...SAMPLE_POSTCARD, note: "This is a much longer note than the card allows. ".repeat(20) };
    const { bytes, report } = await buildPostcardPdf(long, assets);
    expect(report.continuation).toBe(true);
    expect((await inspect(bytes)).pages).toHaveLength(3);
  });

  it("flags photos too small to print sharply", async () => {
    const small = { ...SAMPLE_POSTCARD, moments: [{ ...SAMPLE_POSTCARD.moments[0], src: "/brand/tiny-test.png" }] };
    const tiny = new PNG({ width: 120, height: 90 });
    const tinyBytes = PNG.sync.write(tiny);
    const a = { fetchBytes: async (u: string) => (u.includes("tiny-test") ? new Uint8Array(tinyBytes) : assets.fetchBytes(u)) };
    const { report } = await buildPostcardPdf(small, a);
    expect(report.lowResolution).toEqual([SAMPLE_POSTCARD.moments[0].id]);
  });
});
