// Phase 2.8.5 Task 2 — swap sample card 1 source.
// One-shot script. Source is hard-coded (yagi-provided absolute path).
// After processing, MOVE the source out of Downloads into the
// gitignored public/brand/sources/ tree.

import sharp from "sharp";
import { rename, mkdir } from "node:fs/promises";
import { statSync } from "node:fs";

const SRC =
  "C:\\Users\\yout4\\Downloads\\hf_20260427_090314_46b694bc-a49d-47cb-90f7-9b702dae3e07 1-cloud-redefine-realistic-2x.png";
const STASH = "public/brand/sources/sample-brand-campaign.png";
const OUT = "public/brand/sample-brand-campaign.jpg";

await mkdir("public/brand/sources/", { recursive: true });

const m = await sharp(SRC).metadata();
console.log(`source: ${m.width}x${m.height} ch=${m.channels}`);

let pickedQ = null;
for (const q of [82, 78, 72, 65, 58, 50]) {
  await sharp(SRC)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: q, progressive: true, mozjpeg: true })
    .toFile(OUT);
  const kb = statSync(OUT).size / 1024;
  console.log(`  q=${q} → ${kb.toFixed(1)}KB`);
  if (kb <= 180) {
    pickedQ = q;
    break;
  }
}
console.log(`final: ${statSync(OUT).size} bytes @ q=${pickedQ}`);

await rename(SRC, STASH);
console.log(`moved source → ${STASH}`);
