// Phase 2.8.4 — sample case image optimizer.
// Yagi-provided source images for the projects-hub-hero sample cards.
// Per yagi: "crop 너무 강하게 하지는 말구" — we keep the full
// composition (no server-side crop) and let the hero's aspect-[16/10]
// container do the visual framing via object-cover. Sharp here only
// re-encodes (PNG → JPG), resizes (max 1200px wide for retina), and
// dial-quality until under the size cap.
//
// Sources are passed as positional CLI args so the script is reusable.

import sharp from "sharp";
import { stat, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));

const TARGETS = [
  {
    src: "C:\\Users\\yout4\\Pictures\\Screenshots\\스크린샷 2026-04-27 164648.png",
    out: REPO_ROOT + "public/brand/sample-brand-campaign.jpg",
    sourceCopy:
      REPO_ROOT + "public/brand/sources/sample-brand-campaign-source.png",
    maxKB: 180,
    width: 1200,
  },
  {
    src: "C:\\Users\\yout4\\Downloads\\427f6d0a-c3a0-4c17-94c3-03eeb5940315.png",
    out: REPO_ROOT + "public/brand/sample-music-video.jpg",
    sourceCopy:
      REPO_ROOT + "public/brand/sources/sample-music-video-source.png",
    maxKB: 180,
    width: 1200,
  },
];

async function fileSizeKB(p) {
  const s = await stat(p);
  return s.size / 1024;
}

await mkdir(REPO_ROOT + "public/brand/sources/", { recursive: true });

const results = [];
for (const t of TARGETS) {
  // Save the high-res original under public/brand/sources/ (gitignored)
  // with an ASCII-canonical filename. The original Korean / UUID
  // filenames stay in the user's Downloads/Pictures folder; we work
  // off the full path read here.
  await sharp(t.src).toFile(t.sourceCopy);

  // JPEG re-encode at quality 82 first, then dial down if needed.
  // No crop: yagi explicitly asked to preserve composition.
  let pickedQuality = null;
  for (const quality of [82, 78, 72, 65, 58, 50]) {
    await sharp(t.src)
      .resize({ width: t.width, withoutEnlargement: true })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toFile(t.out);
    const kb = await fileSizeKB(t.out);
    console.log(
      `[${t.out.split("/").pop()}] q=${quality} → ${kb.toFixed(1)}KB (target ≤ ${t.maxKB}KB)`,
    );
    if (kb <= t.maxKB) {
      pickedQuality = quality;
      break;
    }
  }
  const kb = await fileSizeKB(t.out);
  results.push({ out: t.out, kb, quality: pickedQuality ?? 50 });
}

console.log("\n--- summary ---");
for (const r of results) {
  const name = r.out.split(/[\\/]/).pop();
  console.log(`${name}: ${r.kb.toFixed(1)}KB @ q=${r.quality}`);
}
