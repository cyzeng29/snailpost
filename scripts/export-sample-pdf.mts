// Exports the sample postcard PDF and one PNG per page (macOS `sips`) for visual inspection.
// Usage: npx tsx scripts/export-sample-pdf.mts <outDir> [shareUrl]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { buildPostcardPdf } from "../src/lib/pdf.ts";
import { SAMPLE_POSTCARD } from "../src/lib/sample.ts";

const [out, shareUrl] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const pub = join(import.meta.dirname, "..", "public");
const { bytes, report } = await buildPostcardPdf(
  SAMPLE_POSTCARD,
  { fetchBytes: async (u) => new Uint8Array(readFileSync(join(pub, u.replace(/^\//, "")))) },
  { shareUrl },
);
writeFileSync(join(out, "sample.pdf"), bytes);
const doc = await PDFDocument.load(bytes);
for (let i = 0; i < doc.getPageCount(); i++) {
  const one = await PDFDocument.create();
  const [p] = await one.copyPages(doc, [i]);
  one.addPage(p);
  const f = join(out, `page-${i + 1}.pdf`);
  writeFileSync(f, await one.save());
  try {
    execFileSync("sips", ["-s", "format", "png", "-Z", "1800", f, "--out", join(out, `page-${i + 1}.png`)], { stdio: "ignore" });
  } catch {
    console.log("sips unavailable; open the PDF directly");
  }
}
console.log(JSON.stringify(report));
