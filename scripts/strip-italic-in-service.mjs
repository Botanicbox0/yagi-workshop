// Phase 2.8.4 — strip <em>...</em> from in-service surfaces.
// Yagi: italic is brand chrome, not in-service display style. Landing
// and marketing keep their italic intact (they are yagi-rebuilt later
// per the kickoff's explicit "랜딩 페이지는 수정할 필요 없어").
//
// Pattern: `<em>X</em>` → `X` where X contains no nested `<` character.
// All in-service occurrences are plain text or {t(...)} expressions —
// no nested tags. Run from the worktree root.
//
// Files are explicit so the script cannot accidentally strip italic
// from landing or markdown rendering surfaces.

import { readFile, writeFile } from "node:fs/promises";

const FILES = [
  "src/app/[locale]/(auth)/forgot-password/page.tsx",
  "src/app/[locale]/(auth)/reset-password/page.tsx",
  "src/app/[locale]/(auth)/signin/page.tsx",
  "src/app/[locale]/(auth)/signup/page.tsx",
  "src/app/[locale]/app/admin/projects/page.tsx",
  "src/app/[locale]/app/admin/trash/page.tsx",
  "src/app/[locale]/app/commission/[id]/page.tsx",
  "src/app/[locale]/app/invoices/new/page.tsx",
  "src/app/[locale]/app/invoices/[id]/page.tsx",
  "src/app/[locale]/app/invoices/page.tsx",
  "src/app/[locale]/app/meetings/new/page.tsx",
  "src/app/[locale]/app/meetings/[id]/page.tsx",
  "src/app/[locale]/app/meetings/page.tsx",
  "src/app/[locale]/app/preprod/new/page.tsx",
  "src/app/[locale]/app/preprod/page.tsx",
  "src/app/[locale]/app/projects/[id]/page.tsx",
  "src/app/[locale]/app/projects/page.tsx",
  "src/app/[locale]/app/showcases/page.tsx",
  "src/app/[locale]/app/page.tsx",
  "src/app/[locale]/onboarding/brand/page.tsx",
  "src/app/[locale]/onboarding/invite/page.tsx",
  "src/app/[locale]/onboarding/profile/client/page.tsx",
  "src/app/[locale]/onboarding/profile/creator/page.tsx",
  "src/app/[locale]/onboarding/profile/observer/page.tsx",
  "src/app/[locale]/onboarding/profile/studio/studio-form.tsx",
  "src/app/[locale]/onboarding/role/page.tsx",
  "src/app/[locale]/onboarding/workspace/page.tsx",
  "src/components/commission/intake-form.tsx",
  "src/components/invoices/invoice-editor.tsx",
  "src/components/projects/projects-hub-hero.tsx",
  "src/components/showcases/showcase-editor.tsx",
];

// Match <em>X</em> where X has no `<` inside (no nested elements).
const EM_RE = /<em>([^<]*)<\/em>/g;

let totalRemoved = 0;
const fileSummary = [];
for (const rel of FILES) {
  const before = await readFile(rel, "utf8");
  const matches = before.match(EM_RE);
  if (!matches) {
    fileSummary.push({ rel, removed: 0 });
    continue;
  }
  const after = before.replaceAll(EM_RE, "$1");
  await writeFile(rel, after, "utf8");
  fileSummary.push({ rel, removed: matches.length });
  totalRemoved += matches.length;
}

console.log("--- per-file summary ---");
for (const s of fileSummary) {
  if (s.removed > 0) console.log(`  ${s.rel} — removed ${s.removed}`);
}
console.log(`\nTotal <em>…</em> wrappers stripped: ${totalRemoved}`);
console.log(`Files touched: ${fileSummary.filter((s) => s.removed > 0).length} of ${FILES.length}`);
