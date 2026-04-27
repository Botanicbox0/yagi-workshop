// Phase 2.8.3 G_B3_A — brand asset optimizer.
// Source PNGs land at public/brand/yagi-{mark,wordmark}-source.png and we
// emit yagi-{mark,wordmark}.png (sharp PNG re-encode with palette + quality
// dial). Sources stay so yagi can re-export from raw at any time; the
// in-repo path uses ASCII canonical filenames per kickoff §2 G_B3_A.

import sharp from "sharp";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PUBLIC_BRAND = fileURLToPath(new URL("../public/brand/", import.meta.url));

const TARGETS = [
  // Mark — square logo. Resize to 512px max so it can serve as
  // favicon source + sidebar 32px without re-pull. PNG palette mode
  // typically takes a 500KB raw transparent PNG to under 100KB.
  {
    src: "yagi-mark-source.png",
    out: "yagi-mark.png",
    maxKB: 100,
    width: 512,
  },
  // Wordmark — rectangular logotype. 720px wide is enough for a 2x
  // sidebar render.
  {
    src: "yagi-wordmark-source.png",
    out: "yagi-wordmark.png",
    maxKB: 60,
    width: 720,
  },
];

async function fileSizeKB(p) {
  const s = await stat(p);
  return s.size / 1024;
}

async function optimize({ src, out, maxKB, width }) {
  const inPath = PUBLIC_BRAND + src;
  const outPath = PUBLIC_BRAND + out;
  // Quality dial — start at 80, drop until we fit under maxKB.
  // Palette mode + adaptive dither keeps logos crisp at low file size.
  for (const quality of [80, 70, 60, 50, 40, 30]) {
    await sharp(inPath)
      .resize({ width, withoutEnlargement: true })
      .png({
        compressionLevel: 9,
        palette: true,
        quality,
        effort: 10,
      })
      .toFile(outPath);
    const kb = await fileSizeKB(outPath);
    console.log(
      `[${out}] q=${quality} → ${kb.toFixed(1)}KB (target ≤ ${maxKB}KB)`,
    );
    if (kb <= maxKB) {
      return { out, kb, quality };
    }
  }
  // Fell through — keep last attempt and let the caller decide whether
  // to HALT (E_G_B3_A_OVERSIZE) or accept.
  const finalKB = await fileSizeKB(outPath);
  return { out, kb: finalKB, quality: 30 };
}

const results = [];
for (const t of TARGETS) {
  results.push(await optimize(t));
}

console.log("\n--- summary ---");
for (const r of results) console.log(`${r.out}: ${r.kb.toFixed(1)}KB @ q=${r.quality}`);
