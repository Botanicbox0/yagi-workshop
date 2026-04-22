# YAGI Workshop — Roadmap

> **Purpose:** Phase sequencing, dependencies, and success criteria at a glance. For "why each decision", see `/ARCHITECTURE.md`. For "what each phase builds", see each phase's `-spec.md`.

## Shipped

| Phase | Name | Status | Summary file |
|---|---|---|---|
| 1.0 | Bootstrap | ✅ | (pre-autobuild, no summary file) |
| 1.0.6 | Design system (white/black, editorial) | ✅ | (in commit history) |
| 1.1 | Auth + workspace + onboarding + app shell | ✅ | `summary.md` |

## In progress

| Phase | Name | Status | Spec |
|---|---|---|---|
| 1.2 | Projects + references + threads + email + admin + settings | 🎯 building | `phase-1-2-spec.md` + `task_plan.md` |

## Queued (Autopilot chain)

Phases 1.2.5 → 1.9 run as an Autopilot chain triggered by Phase 1.2 completion. Each Phase auto-kicks-off after the previous Phase's Telegram "✅ complete" message, subject to prerequisite checks and env var gates. See `.yagi-autobuild/AUTOPILOT.md` for the execution protocol.

| Phase | Name | Est. duration | Spec | Autopilot gate |
|---|---|---|---|---|
| 1.2.5 | Video + PDF references + intake mode + thread attachments | 2–3 h | `phase-1-2-5-spec.md` | none |
| 1.3 | Meetings (Google Calendar + AI summary) | 3–4 h | `phase-1-3-spec.md` | `GOOGLE_OAUTH_*` env vars |
| 1.4 | Pre-production Board + Fast Feedback Loop (upload-only, NO fal.ai) | 4–5 h | `phase-1-4-spec.md` | none |
| 1.5 | Invoicing (팝빌 전자세금계산서) | 4–5 h | `phase-1-5-spec.md` | `POPBILL_*` env vars |
| 1.6 | Public landing + MDX journal + OG images | 3–4 h | `phase-1-6-spec.md` | none |
| 1.7 | YAGI internal team chat (private, project-independent) | 2–3 h | `phase-1-7-spec.md` | none |
| 1.8 | Notifications (email digest + in-app badges) | 2–3 h | `phase-1-8-spec.md` | none |
| 1.9 | Deliverable Showcase Mode (public portfolio + "Made with YAGI" badge) | 3–4 h | `phase-1-9-spec.md` | none |

## Speculative (Phase 2.0+)

- Kakao 알림톡 (once client count ≥ 10, via Solapi or 비즈고)
- Public competition pages (공모전)
- Creator directory (YAGI collaborator profiles)
- Workflow sharing (teachable creative pipelines)
- Recall.ai / Meetily auto meeting transcripts
- Stripe-like payment escrow for international clients
- Arabic / Thai / Vietnamese locales (SEA expansion)
- "Make a Star" B2C platform (individual virtual-character IP creation)

---

## Dependency graph

```
          1.1 (shipped)
            ↓
          1.2 (building) ──── autopilot trigger ────┐
            ↓                                       │
          1.2.5 ────────────────┐                  │
            ↓                    ↓                  │
          1.3                  1.4                  │
            ↓                    ↓                  │
            └────→ 1.5 ←─────────┘                  │
                   ↓                                 │
                  1.6 (public landing)              │
                   ↓                                 │
                  1.7 (internal team chat)           │
                   ↓                                 │
                  1.8 (notifications)                │
                   ↓                                 │
                  1.9 (showcase) ←── publishes to 1.6 landing's "Work" section
                   ↓
                  2.0+
```

**Hard dependencies:**
- `1.2.5 → 1.2` (extends reference collector + threads)
- `1.3 → 1.2` (meetings link to projects)
- `1.4 → 1.2.5` (Pre-production Board embeds video/pdf references + uses thread attachment infra)
- `1.5 → 1.3` (billable time derived from meetings; also 1.4 deliverables trigger billing)
- `1.7 → 1.2` (reuses thread message infra for team channels)
- `1.8 → 1.2, 1.3, 1.4, 1.5` (notifications piggyback on every event source)
- `1.9 → 1.4, 1.6` (showcase pulls from project deliverables; surfaces on landing)

**Soft dependencies (reorderable if needed):**
- `1.4 ↔ 1.3` — independent after 1.2.5
- `1.6 ↔ 1.7` — landing independent of internal chat; can swap
- `1.8 ↔ 1.7` — notifications can ship before or after team chat

---

## Phase gate criteria

Each phase ships only when ALL of the following are true:

1. `pnpm build` clean — zero TS errors, zero ESLint warnings
2. `pnpm dev` boots cleanly on port 3003
3. End-to-end user flow from phase's spec passes manual smoke test
4. RLS sanity: anonymous query to all new tables returns 0 rows
5. **Codex adversarial review** run with phase-specific focus prompt; all surviving findings fixed (see `.yagi-autobuild/codex-review-protocol.md`)
6. `summary-phase-N.md` written with subtask status + deviations
7. Telegram kill-switch log shows all mandatory pauses were observed
8. ARCHITECTURE.md updated if any §8+ decision was made or amended
9. **Autopilot transition triggered** — next Phase spec read + B-O-E kicked off (unless `--no-autopilot` was set for this Phase)

---

## Why this order

**1.2.5 before 1.3:**
Clients need to share video refs + PDF briefs immediately (primary creative input for music video / AI idol work). Adding it before meetings ensures the reference collector + intake form is complete before muscle memory sets in.

**1.3 before 1.4:**
Meetings establish the YAGI↔client communication rhythm. Pre-production Board is a creative deliverable that follows those meetings.

**1.4 before 1.5 (redesigned — upload-only, no fal.ai):**
Pre-production Board now generates NO images itself — YAGI uploads completed images from their internal pipeline (ComfyUI / YAGI VFX Studio / etc.). This removes fal.ai dependency entirely. Invoicing is meaningless without deliverables to bill against; Pre-production Board is the first billable artifact.

**1.6 before 1.7 / 1.8 / 1.9:**
Public landing is the acquisition container. Must exist before showcase (1.9) can publish into it. Internal chat (1.7) and notifications (1.8) come after because they're internal-tool improvements, not public surface.

**1.9 last:**
Showcase depends on 1.4 deliverables being real (not hypothetical) and 1.6 landing being live (so showcase URLs can point to "more work" back on landing). Shipping 1.9 also signals "YAGI is open for public visibility" — deliberate positioning moment.

---

## Anti-roadmap (things we're deliberately not building)

- **Mobile native app.** PWA is fine for MVP.
- **Real-time collaborative editing (Figma-style) on Pre-production Board.** Single-author + comments is enough.
- **A marketplace for creators.** Explicitly pivoted away.
- **Public competition submissions system.** Until there's at least one contest run, don't build infrastructure for it.
- **Multi-currency invoicing.** KRW only until there's a non-Korean client.
- **Slack/Discord integrations.** Email + in-app is sufficient; team chat (1.7) handles internal.
- **Kakao 알림톡 in Phase 1.** Deferred to 2.0+ when client count justifies template-approval overhead.
- **In-platform AI image/video generation.** Generation happens in our separate pipelines (ComfyUI, VFX Studio); the portal only distributes completed outputs. No FLUX, no Kling, no Sora inside the portal.
- **Push notifications / web push / service worker.** Email + realtime badges are enough.
