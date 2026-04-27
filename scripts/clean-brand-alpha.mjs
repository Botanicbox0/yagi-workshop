// Phase 2.8.5 — alpha cleanup for brand PNGs.
//
// Phase 2.8.4's outputs are correctly RGBA (channels=4, hasAlpha=true) and
// have 0 near-white opaque pixels — yet yagi reports a visible white-ish
// plate behind the wordmark. Pixel probe shows alpha-0 pixels carrying
// non-zero RGB = (76,105,113), which is yagi's exporter's matte color
// leaking through alpha-0 cells. Some browsers / GPU 2D paths un-premultiply
// or composite this RGB even at alpha=0, producing a visible halo / plate.
//
// Fix:
//   1. For every pixel, if alpha < threshold (32), zero out RGB → (0,0,0,0).
//   2. Also chroma-key any near-white opaque pixel (R/G/B all > 240) to
//      alpha=0 — defensive against a future RGB-baked re-export.
//
// Run after scripts/optimize-brand.mjs. Idempotent.

import sharp from "sharp";
import { fileURLToPath } from "node:url";

const PUBLIC_BRAND = fileURLToPath(new URL("../public/brand/", import.meta.url));

const TARGETS = ["yagi-mark.png", "yagi-wordmark.png"];

async function clean(file) {
  const inPath = PUBLIC_BRAND + file;
  const { data, info } = await sharp(inPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let zeroed = 0;
  let chromaed = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3];
    if (a < 32) {
      // Zero RGB on transparent pixels — guarantees no halo regardless
      // of browser premultiplication path.
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      zeroed++;
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 240 && g > 240 && b > 240) {
      // Defensive chroma key — current Phase 2.8.4 outputs have 0 of
      // these, but an RGB-baked future re-export would land them here.
      data[i + 3] = 0;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      chromaed++;
    }
  }
  // Important: explicitly disable palette mode. Indexed PNG quantizes
  // to a palette and Sharp re-derives RGB from the palette index even
  // for alpha-0 cells, which restores the original matte color. Sharp
  // auto-enables palette on low-color images by default — must pass
  // `palette: false` to override. Truecolor RGBA encode preserves
  // zeroed RGB exactly so alpha-0 cells stay (0,0,0,0).
  await sharp(data, { raw: info })
    .png({
      compressionLevel: 9,
      effort: 10,
      palette: false,
    })
    .toFile(inPath);
  console.log(
    `[${file}] zeroed=${zeroed} chroma_keyed=${chromaed} (out of ${info.width * info.height})`,
  );
}

for (const t of TARGETS) await clean(t);
