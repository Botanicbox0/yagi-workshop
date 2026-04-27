# Phase 2.9 — Projects hub editorial redesign + brand system upgrade

```
ROLE     = Builder (Opus 4.7) in worktree g-b-9-editorial
SOURCE   = THIS FILE (visual reference + spec embedded — single source of truth)
RULESET  = .yagi-autobuild/DECISIONS_CACHE.md (Q-001 ~ Q-091, mandatory consult)
SKILL    = yagi-design-system (load via skill system: anti-pattern enforcement)
LANG     = Korean for narrative; English for code/commits
TONE     = deterministic state machine, no preamble
```

This phase is a focused VISUAL UPGRADE. Web Claude analyzed yagi's reference image and converted it into a precise visual signature spec. Builder's job: execute the spec, do NOT re-interpret reference imagery from scratch. The reference image lives at `C:\Users\yout4\Downloads\2376daf3-c196-4f3e-956f-4cc27bc48aca.png` for visual confirmation only — the spec below is authoritative.

---

## §0 — RUN ON ENTRY

```bash
cd C:\Users\yout4\yagi-studio\yagi-workshop
git fetch origin
git status --short
git log --oneline -5 main

# Expected: main HEAD is the repo-hygiene commit OR Phase 2.8.6 SHIPPED commit
# (depending on Builder #6 progress). Either is fine — this phase is independent.
# Allowed untracked: .claire/, .clone/, .yagi-autobuild/mvp-polish/,
#   .claude/settings.local.json, .yagi-autobuild/phase-2-8-{1-followup-1,2,3,4,5,6}/_*
# If main dirty beyond that → HALT E0_ENTRY_FAIL.

# Verify yagi-provided source assets exist
ls "C:\Users\yout4\Downloads\Group 1.png"
ls "C:\Users\yout4\Downloads\11비율 야기워크숍 vfx사진.png"
ls "C:\Users\yout4\Downloads\52 여자 모델 썸네일.png"
ls "C:\Users\yout4\Downloads\Gigapixel_Clipboard_458cd9d1c9020ed3deb8cab0deb4a12797792d415bd646a6ed762b7751937c87-cloud-redefine-creative-3x.png"
ls "C:\Users\yout4\Downloads\2376daf3-c196-4f3e-956f-4cc27bc48aca.png"
# If any missing, HALT E_ASSET_MISSING

# Create worktree
git worktree add ../yagi-workshop-g-b-9-editorial -b g-b-9-editorial
cd ../yagi-workshop-g-b-9-editorial
copy ..\yagi-workshop\.env.local .env.local

pnpm install --frozen-lockfile
pnpm exec tsc --noEmit  # exit 0
```

---

## §1 — STATE MACHINE

```
STATES = [INIT, G_B9_A, G_B9_B, G_B9_C, G_B9_D, G_B9_E, G_B9_F, G_B9_G, REVIEW, SHIPPED, HALT]
Sequence: A → B → C → D → E → F → G → REVIEW → SHIPPED
```

| Gate | Theme | Effort |
|---|---|---|
| **G_B9_A** | Asset processing pipeline (5 source files) | 2h |
| **G_B9_B** | Brand identity refresh (combined logo + sidebar fix) | 2h |
| **G_B9_C** | Font system upgrade (Pretendard + SUIT Variable) | 2h |
| **G_B9_D** | Projects hub editorial redesign (hero + interactive cards) | 8h |
| **G_B9_E** | 4-step workflow strip restyle | 2h |
| **G_B9_F** | Bottom CTA banner | 1h |
| **G_B9_G** | Copy updates (headline + cards) | 1h |
| **REVIEW** | K-05 lite (no DB, no RLS — visual + i18n only) | optional |

Total ≈ 18h work + 1-2h smoke. Target 3 days.

---

## §2 — VISUAL SIGNATURE (extracted from reference image)

This is the NORTH STAR. Every styling decision below derives from this signature.

### 2.1 Layout grid

- 12-column grid, 1280px max content width, 32px gutter
- Hero zone height: ~720px on desktop (above the fold)
- 50/50 split desktop (Left: text/CTA · Right: visual stack)
- Mobile: stack vertically, visual zone first

### 2.2 Color palette

```
--surface-canvas:    #F4F4F2  (warm off-white, NOT pure white — paper feel)
--surface-elevated:  #FFFFFF  (cards, popovers — strict 0 elevation contrast)
--surface-inverse:   #0A0A0A  (deep black, near-true — dark CTA + dark cards)
--ink-primary:       #0A0A0A  (body text on canvas)
--ink-secondary:     #6B6B6B  (sub copy, captions)
--ink-tertiary:      #A8A8A8  (meta labels, disabled)
--ink-on-inverse:    #F4F4F2  (text on dark surfaces)
--border-subtle:     #E8E8E5  (1px hairlines on canvas)
--border-strong:     #1A1A1A  (1px hairlines on dark)
--accent:            (none — this design has zero accent color, contrast does the work)
```

CRITICAL: NO blue/green/orange accent. The reference has none. Status uses pure black/white only.

### 2.3 Typography hierarchy

Two-font system:

```
HEADLINE FONT:  SUIT Variable        weight 700, optical-sizing on
BODY FONT:      Pretendard Variable  weight 400 / 500 / 600 / 700
```

Scale (desktop):

```
hero-display    → SUIT Variable   wt 700  size 56px  line 1.1   tracking -2.0%   "AI 비주얼 작업, ..."
section-title   → SUIT Variable   wt 700  size 28px  line 1.2   tracking -1.0%   "진행 과정"
card-eyebrow    → Pretendard      wt 600  size 11px  line 1.0   tracking +12%    "BRAND CAMPAIGN" (uppercase, letter-spaced)
card-title      → SUIT Variable   wt 700  size 22px  line 1.25  tracking -0.5%   "이미지 + 영상 통합 키비주얼"
card-body       → Pretendard      wt 400  size 14px  line 1.5   tracking 0       card descriptions
body-default    → Pretendard      wt 400  size 15px  line 1.6   tracking 0       sub headlines, paragraphs
body-strong     → Pretendard      wt 600  size 15px  line 1.5   tracking 0       bullet labels
button-label    → Pretendard      wt 600  size 15px  line 1.0   tracking 0       CTA text
meta            → Pretendard      wt 500  size 12px  line 1.4   tracking +6%     "PROJECT" eyebrow above hero
step-number     → SUIT Variable   wt 700  size 13px  line 1.0   tracking 0       "01" "02" "03" "04"
step-title      → Pretendard      wt 600  size 16px  line 1.3   tracking -0.5%
step-desc       → Pretendard      wt 400  size 13px  line 1.5   tracking 0
```

Mobile scale:
- hero-display: 38px (was 56px)
- section-title: 22px (was 28px)
- card-title: 18px (was 22px)

### 2.4 Spacing system

```
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80 / 120 / 160
```

Reference rhythm:
- Hero block top padding: 120px from sidebar header
- Hero block to workflow strip: 160px gap
- Workflow strip to bottom CTA: 80px gap
- Card internal padding: 32px desktop, 24px mobile

### 2.5 Border + radius

```
--radius-sm:   8px   (small chips, badges)
--radius-md:   16px  (cards — primary)
--radius-lg:   24px  (large hero panels)
--radius-pill: 9999px (CTA buttons)
```

Borders: 1px solid `border-subtle` on canvas, 1px solid `border-strong` on dark surfaces. NO drop shadows on cards (reference uses none — canvas separation via radius + bg contrast).

### 2.6 Visual signature characteristics

These are the qualities that make the reference feel "studio-grade" not "SaaS":
- **Generous whitespace.** Hero block uses ~50% of vertical space for breathing.
- **Asymmetric weight.** Left text zone is informational; right visual zone dominates emotionally.
- **Editorial labels.** Tiny eyebrows ("PROJECT", "BRAND CAMPAIGN", "VIDEO PRODUCTION") use uppercase + letter-spacing — magazine convention.
- **Hairline rules.** Section dividers are 1px lines, not 12px gaps.
- **Photography as content.** Visual is huge, dominant, NOT decorative. 1:1 hero card with full-bleed photography reads as a campaign poster.
- **Avatars + social proof.** Below CTA, avatar stack + "+200명 클라이언트" copy. Tiny but high signal.
- **Bullet icons are circles, not check marks.** 32px circle, white-on-black, with a glyph inside. NOT colored, NOT animated.
- **Black CTA pills.** All primary CTAs are pure black pill buttons with white text + arrow icon.
- **Eyebrow → title → body card stack.** Every card follows this exact rhythm.

---

## §3 — G_B9_A — Asset processing pipeline

### Goal
Process 5 yagi-provided source files into optimized assets at the correct paths and sizes. All sources stay in `public/brand/sources/` (gitignored from Phase 2.8.4).

### Source → Destination mapping

```
SOURCE                                                                                    DEST                                          NOTES
C:\Users\yout4\Downloads\Group 1.png                                                      public/brand/yagi-logo-combined.png           Combined mark+wordmark+tagline; replaces yagi-mark.png + yagi-wordmark.png usage in NEW components. KEEP existing yagi-mark.png + yagi-wordmark.png in repo for backwards compat (auth/onboarding layouts use them).

C:\Users\yout4\Downloads\11비율 야기워크숍 vfx사진.png                                    public/brand/sample-vfx-hero.jpg              Square 1:1 dominant hero card. Target 1200x1200, q=82, ≤220KB.

C:\Users\yout4\Downloads\52 여자 모델 썸네일.png                                         public/brand/sample-mv-thumb.jpg              5:2 thumbnail (compressed state). Target 1200x480, q=82, ≤140KB.

C:\Users\yout4\Downloads\Gigapixel_Clipboard_458cd9d1c9020ed3deb8cab0deb4a12797792d415bd646a6ed762b7751937c87-cloud-redefine-creative-3x.png   public/brand/sample-mv-expanded.jpg   1:1 expanded state (after hover). Target 1200x1200, q=82, ≤220KB. Source is 56MB — sharp aggressive compression mandatory.
```

### Implementation

Extend `scripts/optimize-brand.mjs` (already exists from Phase 2.8.3) with new entry points OR create `scripts/process-phase-2-9-assets.mjs`. Use sharp:

```js
// Per-image config example
await sharp(SOURCE)
  .resize(1200, 1200, { fit: 'cover', position: 'attention' })  // smart crop, conservative — yagi: "crop 너무 강하게 하지 말고"
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(DEST);
```

For `sample-mv-thumb.jpg` (5:2 ratio):
```js
.resize(1200, 480, { fit: 'cover', position: 'attention' })
```

For `Group 1.png` (combined logo):
- Apply Phase 2.8.5 chroma-key technique (`scripts/clean-brand-alpha.mjs`) to ensure transparent bg
- DO NOT resize — keep at intrinsic resolution, max 4000px wide
- `palette: false` mandatory on encode
- Output ≤200KB

### Move sources

After processing, move source files OUT of Downloads:
```
C:\Users\yout4\Downloads\Group 1.png                              → public/brand/sources/yagi-logo-combined.png
C:\Users\yout4\Downloads\11비율 야기워크숍 vfx사진.png             → public/brand/sources/sample-vfx-hero.png
C:\Users\yout4\Downloads\52 여자 모델 썸네일.png                  → public/brand/sources/sample-mv-thumb.png
C:\Users\yout4\Downloads\Gigapixel_...creative-3x.png             → public/brand/sources/sample-mv-expanded.png
```

`2376daf3-...png` (the reference layout) — **do NOT move**. Yagi may want to re-reference. Leave in Downloads.

### EXIT
- [ ] 4 optimized assets in `public/brand/` at correct sizes
- [ ] 4 sources moved to `public/brand/sources/` (gitignored)
- [ ] Logo PNG verified transparent on dark + light backgrounds (manual smoke later)
- [ ] All file sizes within budget

---

## §4 — G_B9_B — Brand identity refresh

### B.1 Combined logo in sidebar

**Current state (Phase 2.8.5):** sidebar header renders `yagi-mark.png` (24px) + `yagi-wordmark.png` (16px) side-by-side OR stacked. Workspace label below in a separate row with a 1px border between.

**Yagi feedback:**
- "단차가 보이는데 이거 없애야 할 듯" — the visual seam between brand block and workspace label is jarring.
- New combined logo (`Group 1.png`) is a single image with mark + wordmark + tagline ("AI NATIVE ENTERTAINMENT STUDIO"). Use ONE image at the top.

**Implementation:**

In `src/components/app/sidebar-brand.tsx` (or wherever the sidebar header lives):
- Replace the two-image render with ONE `<Image src="/brand/yagi-logo-combined.png" />` 
- Display height: 36-40px desktop, 28-32px mobile collapsed sidebar
- Width: auto, intrinsic ratio
- Container padding: 16-20px
- REMOVE the bottom border between brand block and workspace label
- Workspace label row keeps its own padding but no separator line — use spacing only

The collapsed/mobile sidebar can fall back to the SQUARE mark only (`yagi-mark.png` if needed) — but if `Group 1.png` includes a clean mark on the left, you can use a CSS `clip-path` or `object-position` to show only the mark portion. Simpler: keep the mobile fallback to `yagi-mark.png`.

### B.2 Workspace label

**Current state:** Phase 2.8.5 added a label like "테스트_브랜드" below the brand block, with a top + bottom hairline border.

**Change:** Remove BOTH borders. Keep only padding for separation. The label sits as plain text, ~14px Pretendard wt 500, color `--ink-secondary`.

The reference image shows the brand block as a clean unit at the top. The current build's "step" between brand and workspace is what yagi wants gone.

### EXIT
- [ ] Combined logo displays at sidebar top
- [ ] No visible seam/step between brand block and workspace label
- [ ] Workspace label readable but secondary
- [ ] Mobile collapsed sidebar shows mark only
- [ ] Auth/onboarding layouts still use `yagi-wordmark.png` (don't touch — backwards compat)

---

## §5 — G_B9_C — Font system upgrade

### C.1 Add SUIT Variable

Pretendard is already in the project. Add SUIT Variable (free Korean font from 눈누).

Source: https://github.com/sun-typeface/SUIT (download SUIT-Variable.woff2)
OR: CDN — https://cdn.jsdelivr.net/gh/sun-typeface/SUIT/fonts/variable/woff2/SUIT-Variable.woff2

Recommended: SELF-HOST. Download SUIT-Variable.woff2 + license file, place in `public/fonts/SUIT-Variable.woff2`. CDN fonts add an external dependency that breaks if the CDN goes down.

In `src/app/[locale]/layout.tsx` (or wherever the existing `Pretendard` font is loaded), add:

```tsx
import localFont from 'next/font/local';

const suit = localFont({
  src: '../../public/fonts/SUIT-Variable.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '100 900',
});

// In <html>: className={`${pretendard.variable} ${suit.variable}`}
```

### C.2 Tailwind config

In `tailwind.config.ts`, extend `fontFamily`:

```ts
fontFamily: {
  sans: ['var(--font-pretendard)', 'system-ui', 'sans-serif'],     // body
  display: ['var(--font-display)', 'var(--font-pretendard)', 'sans-serif'],  // headlines
}
```

### C.3 Apply

Use `font-display` (SUIT) for:
- Hero headline (`AI 비주얼 작업, ...`)
- Section titles (`진행 과정`, `프로젝트, 이제 시작해볼까요?`)
- Card titles (`이미지 + 영상 통합 키비주얼`)
- Step numbers (`01`, `02`, ...)

Use `font-sans` (Pretendard) for:
- Sub-headlines, body copy, bullets
- CTA button labels
- Meta/eyebrows (uppercase letter-spaced)
- Any UI chrome

Default `<body>` stays on Pretendard. Only add `font-display` opt-in where needed.

### EXIT
- [ ] SUIT Variable loaded as local font
- [ ] Tailwind `font-display` utility works
- [ ] No CLS (font swap is invisible)
- [ ] License file present at `public/fonts/SUIT-LICENSE.txt`

---

## §6 — G_B9_D — Projects hub editorial redesign

This is the heart of the phase. Rebuild `src/components/projects/projects-hub-hero.tsx` to match the reference layout with the interactive hover behavior yagi specified.

### D.1 Layout structure

```
<section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 py-20 lg:py-32">
  
  {/* LEFT — Decision zone */}
  <div className="flex flex-col gap-8">
    <p className="meta text-ink-tertiary">PROJECT</p>
    
    <h1 className="font-display text-5xl lg:text-[56px] leading-[1.1] tracking-[-0.02em] font-bold text-ink-primary">
      AI 비주얼 작업,
      <br />
      의뢰부터 결과까지
      <br />
      한 번에 끝내세요
    </h1>
    
    <p className="text-base text-ink-secondary">
      의뢰부터 납품까지, 한 흐름으로 진행됩니다.
    </p>
    
    {/* Bullet list — 32px circle icons, NO color */}
    <ul className="flex flex-col gap-4 mt-4">
      <li className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-inverse flex items-center justify-center">
          <ArrowRightIcon className="w-4 h-4 text-ink-on-inverse" />
        </div>
        <span className="text-[15px] font-medium text-ink-primary">의뢰부터 결과물까지 한 흐름으로 진행</span>
      </li>
      <li className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-inverse flex items-center justify-center">
          <MessageSquareIcon className="w-4 h-4 text-ink-on-inverse" />
        </div>
        <span className="text-[15px] font-medium text-ink-primary">기획, 피드백, 수정까지 보드에서 관리</span>
      </li>
      <li className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-inverse flex items-center justify-center">
          <UsersIcon className="w-4 h-4 text-ink-on-inverse" />
        </div>
        <span className="text-[15px] font-medium text-ink-primary">프로젝트에 맞게 YAGI 스튜디오 제작 / 크리에이터 매칭</span>
      </li>
    </ul>
    
    {/* CTA + social proof */}
    <div className="flex flex-col gap-4 mt-6">
      <Link href="/app/projects/new"
        className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-surface-inverse text-ink-on-inverse text-[15px] font-semibold w-fit hover:scale-[1.02] transition-transform">
        프로젝트 의뢰하기
        <ArrowUpRightIcon className="w-4 h-4" />
      </Link>
      
      <div className="flex items-center gap-3">
        <AvatarStack /* 4 client avatars overlapping */ />
        <p className="text-xs text-ink-secondary">
          +200명 이상의 클라이언트가
          <br />
          YAGI와 함께하고 있어요
        </p>
      </div>
    </div>
  </div>
  
  {/* RIGHT — Visual stack with interactive transition */}
  <InteractiveVisualStack />
  
</section>
```

### D.2 InteractiveVisualStack — the hover-transition component

This is the critical interactive piece. Use **Framer Motion** for layout animation.

Verify framer-motion is in deps. If not:
```bash
pnpm add framer-motion
```

Component spec:

```tsx
// src/components/projects/interactive-visual-stack.tsx
'use client';

import { useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import Image from 'next/image';
import { ArrowUpRightIcon } from 'lucide-react';

export function InteractiveVisualStack() {
  const [hovered, setHovered] = useState<'top' | 'bottom' | null>(null);
  // bottom hover: top shrinks 1:1 → 5:2, bottom expands 5:2 → 1:1
  
  const isBottomHovered = hovered === 'bottom';
  
  return (
    <LayoutGroup>
      <div className="flex flex-col gap-4 h-full">
        
        {/* TOP CARD — defaults to 1:1, shrinks to 5:2 when bottom is hovered */}
        <motion.div
          layout
          onMouseEnter={() => setHovered('top')}
          onMouseLeave={() => setHovered(null)}
          className="relative overflow-hidden rounded-2xl bg-surface-inverse cursor-pointer"
          animate={{
            aspectRatio: isBottomHovered ? '5 / 2' : '1 / 1',
          }}
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 22,
            mass: 0.9,
          }}
        >
          <motion.div layout className="absolute inset-0">
            <Image
              src="/brand/sample-vfx-hero.jpg"
              alt="브랜드를 위한 비주얼 캠페인 — YAGI VFX 작업물"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
          
          {/* Gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
          
          {/* Card content */}
          <motion.div layout="position" className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-white/80 uppercase mb-2">
              BRAND CAMPAIGN
            </p>
            <h3 className="font-display text-xl lg:text-2xl font-bold text-white leading-tight">
              브랜드를 위한 비주얼 캠페인
            </h3>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">
              이미지와 영상을 하나의 강력한 키비주얼로 완성합니다.
            </p>
          </motion.div>
        </motion.div>
        
        {/* BOTTOM CARD — defaults to 5:2, expands to 1:1 when hovered */}
        <motion.div
          layout
          onMouseEnter={() => setHovered('bottom')}
          onMouseLeave={() => setHovered(null)}
          className="relative overflow-hidden rounded-2xl bg-surface-inverse cursor-pointer"
          animate={{
            aspectRatio: isBottomHovered ? '1 / 1' : '5 / 2',
          }}
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 22,
            mass: 0.9,
          }}
        >
          <motion.div layout className="absolute inset-0">
            <Image
              src={isBottomHovered ? '/brand/sample-mv-expanded.jpg' : '/brand/sample-mv-thumb.jpg'}
              alt="영상 연출 강화 — 뮤직비디오 / 시네마틱"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
          
          <motion.div layout="position" className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-white/80 uppercase mb-2">
              VIDEO PRODUCTION
            </p>
            <h3 className="font-display text-xl lg:text-2xl font-bold text-white leading-tight">
              영상 연출 강화
              <span className="text-white/70 text-base font-normal ml-2">
                (뮤직비디오, Cinematics)
              </span>
            </h3>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">
              기존 영상에 AI기반 연출을 더해 완성도를 끌어올립니다.
            </p>
          </motion.div>
          
          {/* Expand indicator (top-right) */}
          <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <ArrowUpRightIcon className="w-5 h-5 text-white" />
          </div>
        </motion.div>
        
      </div>
    </LayoutGroup>
  );
}
```

### D.3 Critical animation rules

- **Spring physics, not eased duration.** `stiffness: 80, damping: 22, mass: 0.9` gives a natural settle without bounce. Test on hover-out — must NOT visibly bounce/overshoot.
- **`layout="position"` on text container** — text reflows smoothly, doesn't jitter.
- **Image swap (thumb → expanded) is instant**, but the surrounding container animation masks it. If the swap is visible/jarring, layer both images and crossfade with `motion.div animate={{ opacity }}`.
- **Mobile: disable hover transition.** On touch devices (`@media (hover: hover)`), only the hovered states apply. On mobile, BOTH cards stay at their default ratios.

### D.4 Image preloading

Both `sample-mv-thumb.jpg` and `sample-mv-expanded.jpg` should be preloaded — yagi explicitly wants the transition smooth. Add `<link rel="preload" as="image" />` in the page head OR use `<Image priority>` on both.

### EXIT
- [ ] LEFT zone matches reference layout
- [ ] RIGHT zone has TOP card (1:1) + BOTTOM card (5:2) on default state
- [ ] Hovering BOTTOM card: TOP shrinks to 5:2, BOTTOM expands to 1:1, image swaps
- [ ] Transition is spring, ~600ms total settle, no bounce on hover-out
- [ ] Text content repositions smoothly (no jitter)
- [ ] Mobile: cards stack, no hover behavior
- [ ] No layout shift on initial page load (images preloaded)

---

## §7 — G_B9_E — Workflow strip restyle

### Current state (Phase 2.8.2 G_B2_A)
4-step strip showing: 의뢰 작성 → 디렉터 매칭 → 기획 · 피드백 → 납품 · 완료

### Restyle to match reference

```tsx
<section className="border-t border-border-subtle py-16 lg:py-20">
  <h2 className="font-display text-2xl lg:text-[28px] font-bold tracking-tight mb-12">
    진행 과정
  </h2>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
    {/* Optional: dotted/dashed connector line behind cards on desktop */}
    
    {steps.map((step, i) => (
      <div key={i} className="bg-surface-elevated rounded-2xl p-6 lg:p-8 border border-border-subtle">
        <step.icon className="w-5 h-5 text-ink-primary mb-6" />
        <p className="font-display text-sm font-bold tracking-tight text-ink-primary">
          {String(i + 1).padStart(2, '0')}
        </p>
        <h3 className="font-display text-base lg:text-lg font-bold mt-2 mb-3 tracking-tight">
          {step.title}
        </h3>
        <p className="text-[13px] text-ink-secondary leading-relaxed">
          {step.desc}
        </p>
      </div>
    ))}
  </div>
</section>
```

Step content:
```
01  의뢰 작성       작업 목적과 레퍼런스를 간단히 남겨주세요.
02  디렉터 매칭    프로젝트에 맞는 디렉터와 크리에이터를 매칭합니다.
03  기획 · 피드백  함께 기획하고 보드에서 피드백을 주고받습니다.
04  납품 · 완료    최종 결과물을 확인하고 프로젝트를 완료합니다.
```

Icons (lucide-react):
- 01: Pencil
- 02: Users
- 03: MessageSquare
- 04: CheckCheck

### EXIT
- [ ] 4 cards in horizontal grid (desktop), 2x2 (tablet), stacked (mobile)
- [ ] Number `01..04` uses SUIT bold
- [ ] Hairline border, no shadow
- [ ] Section header "진행 과정" left-aligned

---

## §8 — G_B9_F — Bottom CTA banner

Full-width black band at bottom of page:

```tsx
<section className="bg-surface-inverse rounded-3xl px-8 lg:px-16 py-12 lg:py-16 mt-20">
  <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 lg:gap-12 items-center">
    
    <h2 className="font-display text-3xl lg:text-4xl font-bold leading-[1.1] tracking-tight text-ink-on-inverse">
      프로젝트, 이제
      <br />
      시작해볼까요?
    </h2>
    
    <p className="text-base text-ink-on-inverse/70 leading-relaxed">
      아이디어만 있어도 괜찮아요.
      <br />
      YAGI가 처음부터 끝까지 함께합니다.
    </p>
    
    <Link href="/app/projects/new"
      className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-surface-canvas text-ink-primary text-[15px] font-semibold whitespace-nowrap hover:scale-[1.02] transition-transform">
      프로젝트 의뢰하기
      <ArrowUpRightIcon className="w-4 h-4" />
    </Link>
    
  </div>
</section>
```

Mobile: stack vertically, CTA full-width.

### EXIT
- [ ] Banner sits below workflow strip with 80px gap
- [ ] CTA pill is white-on-black (inverse of top CTA)
- [ ] Headline + sub-copy + CTA in 3-column layout desktop, stacked mobile

---

## §9 — G_B9_G — Copy updates (already in §6 + §7 + §8)

Verify all copy changes vs current main:

| Surface | Old | New |
|---|---|---|
| Hero headline | "AI 비주얼 작업을 한 곳에서 의뢰하고 / 결과까지 완성하세요" | "AI 비주얼 작업, / 의뢰부터 결과까지 / 한 번에 끝내세요" |
| Card 1 title | "브랜드 AI 비주얼 캠페인" | "브랜드를 위한 비주얼 캠페인" |
| Card 1 sub | "이미지 + 영상 통합 키비주얼" | "이미지와 영상을 하나의 강력한 키비주얼로 완성합니다." |
| Card 2 title | "뮤직비디오 / 영상 제작" | "영상 연출 강화 (뮤직비디오, Cinematics)" |
| Card 2 sub | "스토리보드 + AI 비주얼 + 편집" | "기존 영상에 AI기반 연출을 더해 완성도를 끌어올립니다." |
| Hero meta eyebrow | (none) | "PROJECT" |
| Section title | (none, or "이런 프로젝트가 가능해요") | "진행 과정" (above workflow strip) |

i18n: update VALUES in `messages/ko.json` + `messages/en.json`. **DO NOT rename keys.**

EN translations:
- Hero: "AI visual work, / from request to delivery / in one place"
- Card 1 title: "Brand visual campaign" / sub: "We build images and video into one strong key visual."
- Card 2 title: "Video direction enhancement (MV, Cinematics)" / sub: "AI-driven direction added to existing footage to elevate the result."
- Section title: "Process"

### EXIT
- [ ] All copy updates applied
- [ ] No "AI VFX" anywhere on this page (Q-090 enforcement)
- [ ] EN matches KO intent

---

## §10 — REVIEW

This phase has NO database / RLS / new server actions / new email / new storage. K-05 review is OPTIONAL per Phase 2.8.3 precedent.

Builder decision rule:
- If ONLY UI/i18n/asset changes (expected) → SKIP K-05
- If any tsc/lint/build error required a non-trivial workaround → run K-05 to confirm no regression

Document decision in `_run.log`.

---

## §11 — SHIPPED

```bash
cd ..\yagi-workshop
git checkout main
git pull origin main --ff-only
git merge g-b-9-editorial --ff-only
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit && pnpm lint && pnpm build  # all exit 0
git push origin main
```

Log to `.yagi-autobuild/phase-2-9/_run.log`:
```
<ISO> phase-2-9 SHIPPED gates=A,B,C,D,E,F,G review=skipped tsc=ok lint=ok build=ok assets=4 fonts=2
```

Manual smoke checklist (in commit message):
- [ ] Sidebar shows new combined logo, no seam to workspace label
- [ ] Logo transparent on hover/focus states
- [ ] Hero headline 3 lines, SUIT Variable visible
- [ ] LEFT zone: bullet circles black-and-white, CTA pill black, avatar stack present
- [ ] RIGHT zone: top card 1:1, bottom card 5:2 by default
- [ ] Hover bottom card: smooth ~600ms spring transition, top → 5:2, bottom → 1:1, images swap
- [ ] Hover top card: top stays 1:1, bottom stays 5:2 (only bottom-hover triggers)
- [ ] Workflow strip 4 cards, "진행 과정" header
- [ ] Bottom black CTA banner with white pill button
- [ ] Mobile: stacks cleanly, no hover behavior
- [ ] No "AI VFX" anywhere on page

---

## §12 — HALT triggers

| Code | When |
|---|---|
| E0_ENTRY_FAIL | §0 git/worktree/install fails |
| E_ASSET_MISSING | any of 5 source files not at expected path |
| E_ASSET_OVERSIZE | any optimized output > 2x its budget |
| E_FONT_LOAD_FAIL | SUIT-Variable.woff2 not found at /public/fonts/ after install |
| E_FRAMER_MOTION_REGRESSION | adding framer-motion breaks an existing component |
| E_TSC_FAIL after 1 auto-fix loop |
| E_VFX_LEAK | grep finds "AI VFX" in any /app/projects surface |
| E_TIMELINE_OVERRUN | total elapsed > 5d HARD_CAP |

---

## §13 — FORBIDDEN

1. Modify landing page (`src/app/[locale]/page.tsx` or `src/components/home/*` or `src/components/marketing/*`) — yagi rebuilds landing later
2. Rename i18n keys (values fine)
3. Add new tables / migrations / RPCs
4. Korean characters in any in-repo path or import
5. Replace Pretendard with SUIT entirely (SUIT is HEADLINE only)
6. Use any color accent beyond pure black/white grays
7. Add drop shadows on cards (reference uses none)
8. Add the workspace label seam back (yagi explicitly removed)
9. Touch the auth/onboarding layouts' wordmark image (Phase 2.8.4 wired them, leave alone)
10. Make the hover transition aggressive/fast (yagi: "transition 자연스럽게")

---

## §14 — DECISIONS_CACHE active

- Q-081 Codex CLI invocation (REVIEW, if needed)
- Q-084 Workshop terminology (sidebar label)
- Q-090 No "AI VFX" on user-selection surfaces — enforce on hero copy

---

## §15 — Append Q-092 to DECISIONS_CACHE on SHIPPED

```markdown
---

### Q-092: Editorial design system — Pretendard + SUIT, no accent color, hover-transition cards

**Asked context:** Phase 2.8.5 SHIPPED 후 야기가 /app/projects 디자인을 보고 generic SaaS 느낌이라며 reference image (2376daf3-...png) 제공 + 폰트/카피/interactive 요구사항 정리.

**Question:** YAGI 제품 디자인의 visual signature?

**Answer:**
1. 2-font system: Pretendard Variable (body) + SUIT Variable (headline). Headline 전용 분리.
2. 무채색 only — black/white/gray. Accent color 0개. Contrast 가 일을 함.
3. Hairline borders (1px), no drop shadows on cards. Surface separation은 radius + bg contrast.
4. Editorial labels: 11px uppercase letter-spaced eyebrows ("BRAND CAMPAIGN"). Magazine convention.
5. Asymmetric weight: text zone 정보, visual zone 감정. 50/50 split.
6. Photography as content (not decoration). 1:1 dominant card with full-bleed.
7. Spring physics for layout transitions (Framer Motion). 자연스러운 settle, no bounce.
8. Black CTA pills, white-on-black-on-white inversion at bottom CTA banner.
9. Workspace label = plain text, no separator border (단차 제거).

**Rationale:** Yagi reference (entertainment studio + editorial magazine 톤) ≠ SaaS template. 모든 styling 결정은 reference 의 visual signature 에서 파생.

**Applies when:** Phase 2.10 landing rewrite, Phase 3 contest UI, future Workshop surface design. 모든 곳에서 이 token + principle 일관 적용.

**Confidence:** HIGH (야기 직접 reference 제공 2026-04-27)
**Registered:** 2026-04-27 (Phase 2.9 SHIPPED)
```

---

## §16 — Builder execution instruction

You are the Builder for Phase 2.9. Execute this kickoff exactly as written. Start with §0 RUN ON ENTRY. Follow the state machine through 7 gates (A→B→C→D→E→F→G), then REVIEW (likely SKIP per §10), then SHIPPED. Append Q-092 in the SHIPPED commit. Halt only on §12 triggers. Log to `.yagi-autobuild/phase-2-9/_run.log`. Do not ask yagi for confirmation between gates. Begin now.
