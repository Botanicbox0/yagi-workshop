// Phase 2.9 G_B9_A — 5-asset processing pipeline.
//
// Processes 4 yagi-provided source files into optimized in-repo assets,
// then moves the originals out of Downloads into public/brand/sources/
// (gitignored from Phase 2.8.4). The 5th source — the reference layout
// 2376daf3-...png — stays in Downloads (yagi may re-reference).
//
// Logo (Group 1.png): combined mark + wordmark + tagline. Alpha-clean
// via Phase 2.8.5 technique (zero RGB on transparent cells, palette:false
// on encode) so transparent regions render cleanly on dark + light bg.
//
// Three sample JPGs use mozjpeg progressive at q=82, no server-side
// crop beyond fit:'cover' to the target aspect (yagi: "crop 너무 강하게
// 하지 말고"). Position 'attention' lets sharp pick the most salient
// region when ratio mismatch forces a crop.

import sharp from "sharp";
import { rename, mkdir } from "node:fs/promises";
import { statSync } from "node:fs";

const D = "C:\\Users\\yout4\\Downloads\\";

const LOGO_SOURCE = `${D}Group 1.png`;
const VFX_SOURCE = `${D}11비율 야기워크숍 vfx사진.png`;
const MV_THUMB_SOURCE = `${D}52 여자 모델 썸네일.png`;
const MV_EXPANDED_SOURCE = `${D}Gigapixel_Clipboard_458cd9d1c9020ed3deb8cab0deb4a12797792d415bd646a6ed762b7751937c87-cloud-redefine-creative-3x.png`;

await mkdir("public/brand/sources", { recursive: true });

// 1. Combined logo — alpha-clean transparent PNG, max 4000px wide.
async function processLogo() {
  const out = "public/brand/yagi-logo-combined.png";
  // First pass: ensure RGBA, resize if needed, no palette.
  const meta = await sharp(LOGO_SOURCE).metadata();
  const targetWidth = Math.min(meta.width ?? 4000, 4000);
  let img = await sharp(LOGO_SOURCE).ensureAlpha();
  if ((meta.width ?? 0) > 4000) img = img.resize({ width: 4000 });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  // Zero RGB on transparent cells + chroma-key near-white opaque cells.
  let zeroed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      zeroed++;
    }
  }

  await sharp(data, { raw: info })
    .png({ compressionLevel: 9, effort: 10, palette: false })
    .toFile(out);

  const kb = statSync(out).size / 1024;
  console.log(
    `[${out}] ${kb.toFixed(1)}KB (target ≤200KB) · width=${targetWidth} · transparent_zeroed=${zeroed}`,
  );
  return { out, kb };
}

// 2-4. Sample JPGs.
async function processJpg(src, out, w, h, maxKB) {
  let pickedQ = null;
  for (const q of [82, 78, 72, 65, 58, 50]) {
    await sharp(src)
      .resize({ width: w, height: h, fit: "cover", position: "attention" })
      .jpeg({ quality: q, progressive: true, mozjpeg: true })
      .toFile(out);
    const kb = statSync(out).size / 1024;
    if (kb <= maxKB) {
      pickedQ = q;
      break;
    }
  }
  const kb = statSync(out).size / 1024;
  console.log(
    `[${out}] ${kb.toFixed(1)}KB @ q=${pickedQ ?? "<min>"} · ${w}x${h} (target ≤${maxKB}KB)`,
  );
  return { out, kb, quality: pickedQ };
}

const logoResult = await processLogo();
const vfxResult = await processJpg(
  VFX_SOURCE,
  "public/brand/sample-vfx-hero.jpg",
  1200,
  1200,
  220,
);
const mvThumbResult = await processJpg(
  MV_THUMB_SOURCE,
  "public/brand/sample-mv-thumb.jpg",
  1200,
  480,
  140,
);
const mvExpResult = await processJpg(
  MV_EXPANDED_SOURCE,
  "public/brand/sample-mv-expanded.jpg",
  1200,
  1200,
  220,
);

// Move sources to public/brand/sources/ (gitignored). Use ASCII names.
const moves = [
  [LOGO_SOURCE, "public/brand/sources/yagi-logo-combined.png"],
  [VFX_SOURCE, "public/brand/sources/sample-vfx-hero.png"],
  [MV_THUMB_SOURCE, "public/brand/sources/sample-mv-thumb.png"],
  [MV_EXPANDED_SOURCE, "public/brand/sources/sample-mv-expanded.png"],
];
for (const [src, dst] of moves) {
  await rename(src, dst);
  console.log(`moved ${src} → ${dst}`);
}

console.log("\n--- summary ---");
console.log(`logo:       ${logoResult.kb.toFixed(1)}KB`);
console.log(`vfx-hero:   ${vfxResult.kb.toFixed(1)}KB`);
console.log(`mv-thumb:   ${mvThumbResult.kb.toFixed(1)}KB`);
console.log(`mv-expand:  ${mvExpResult.kb.toFixed(1)}KB`);
