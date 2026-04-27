# Phase 2.7 — References

**Companion to** `SPEC.md` + `IMPLEMENTATION.md`
**Status:** v1, 2026-04-24

---

## §1 — ADRs referenced

**To be filed at G9 (cross-phase tidy):**

- **ADR-011** Business model pivot: challenge-first → commission-first
- **ADR-012** Payment strategy: brokerage-only MVP, escrow deferred to Phase 2.8+
- **ADR-013** Design language: Webflow cinematic premium
- **ADR-014** ranking_tier auto-upgrade hybrid approach

**Referenced from Phase 2.5/2.6:**

- ADR-005 Gate Autopilot (triage pattern applied to G9 hardening loops)
- ADR-008 No breadcrumbs (carried forward; growth-trigger가 발동하지 않는 한 유지)
- ADR-009 Role type reconciliation (ProfileRole extended with 'client')
- ADR-010 Sidebar IA grouping (의뢰 surfaces get new 의뢰 group or share 작업 group)

## §2 — Phase 2.5/2.6 dependencies

### Schema (read-only)

- `profiles` (role enum expanded, existing columns preserved)
- `creators`, `studios` (new columns appended, existing preserved)
- `user_roles` (yagi_admin role reused via `is_yagi_admin()`)
- `notification_events` (Phase 1.8 registry extended with 12 new kinds)
- `notification_preferences` (2 new columns appended)

### Infrastructure reuse

- **R2 upload pattern** (Phase 2.5 G4): prefix ownership validation, presigned URL, tmp→permanent move
- **Notification dispatch** (Phase 1.8): `notify-dispatch` Edge Function 템플릿 10개 + 이메일 전송
- **pg_cron** (Phase 2.5 G7): 신규 `milestones-deadline-reminder` 추가 같은 패턴
- **Realtime subscriptions** (Phase 2.5 G7): publication 확장, 기존 subscribe 패턴 재사용
- **Auth middleware** (Phase 2.5 baseline): role 기반 route gating 확장 (client 추가)
- **`useUserScopes` hook** (Phase 2.6 G0): client scope 추가 — 이게 Phase 2.6 설계 덕분에 자연스러움

### UI primitives reuse

- `<Sheet>` (Phase 2.6 G4 mobile drawer) — project messages modal 재사용
- `<Dialog>`, `<Input>`, `<Textarea>`, `<Select>`, `<Button>` (기존)
- `<SidebarGroupLabel>` (Phase 2.6 G1) — 새 "의뢰" group에 재사용
- `<StatusPill>` (pre-Phase 2.5) — project.state, contract.state, milestone.state 전부 pill로
- `<PageHelpLink>` (Phase 2.6 G3) — commission new + discover에 help 추가 예정

---

## §3 — Cross-phase terminology table

| Phase 2.5 term | Phase 2.7 term | Note |
|---|---|---|
| Challenge | Challenge | 유지, 쇼케이스 역할로 재위치 |
| Submission | Submission (challenge), Deliverable (project) | 용어 분리 — 오해 방지 |
| Creator (role) | Creator (role) | 유지 |
| Studio (role) | Studio (role) | 유지 |
| Observer (role) | Observer (role) | 유지, 의뢰 surface에는 제한적 접근 |
| (없음) | Client (role) | 신규 |
| (없음) | Commission / Project | 동의어, DB 테이블명은 `projects` |
| (없음) | Proposal | Creator가 Project에 제출 |
| (없음) | Contract | Client-Creator 양자간 문서 |
| Instagram handle (creator) | Instagram handle (creator/client) | Client도 보유 가능 (회사 공식 계정) |

---

## §4 — External dependencies (new)

- `@react-pdf/renderer` OR `puppeteer` / `playwright` for server-side PDF (pdf skill 확인)
  - **pdf skill 권장** — 이미 YAGI workspace에 있음
  - Fallback: client-side PDF generation via react-pdf (더 유연하지만 edge runtime 한계)
- GSAP + ScrollTrigger (G8) — ScrollTrigger 라이선스 2024+ 변경 확인 필요
- Alternative motion: `motion` (framer-motion 후속작) — 이미 react 19 친화, gsap 대신 사용 가능

### License check (at G8 entry)

- **Migra** (Pangram Pangram) — $149-199 commercial desktop license, 구매 후 self-host
- **PP Editorial New** (Pangram Pangram) — 유사 pricing
- **Playfair Display** (Google Fonts) — OFL, 무료, MVP용
- **Cormorant Garamond** (Google Fonts) — OFL, 무료, 대안
- **GSAP** (Greensock) — free for non-commercial, paid for business (Club GreenSock $99-199/yr)
- **ScrollTrigger** — 현재 무료 (Greensock policy 2024 시점), 2026 정책 G8 진입 전 확인

---

## §5 — Stakeholder signoff (야기 내부용)

Phase 2.7 승인 시점:

- 2026-04-24 late night: 야기 "Option 3 공격적 모드" 승인
- SPEC v1 + IMPLEMENTATION v1 web Claude 저술
- 야기 아침 read-through + 조정 요청 가능
- Builder 투입은 야기 morning go/no-go 후

---

## §6 — Open questions (carry to Phase 2.7 G1 cache MISS resolution)

These questions are pre-answered in DECISIONS_CACHE Q-046~080:

- Client signup에 phone number 필수? (기본: No — privacy 감안, post-signup optional)
- Client verification process? (기본: manual admin, `verified_at` stamp)
- Project brief MD editor 품질? (기본: textarea + markdown preview, WYSIWYG는 Phase 3+)
- Proposal submission 시 pay-to-apply? (기본: No — creator acquisition이 먼저)
- Multi-winner in challenge → 모두 portfolio auto-add? (기본: No, 자율 curate 유지)
- Client can request specific creator? (기본: Yes — invite_only visibility 이 이를 위함)
- PDF contract 법적 validity? (기본: "전자서명 + 증빙 기록 보관"은 MVP 적법, 향후 공인전자문서 upgrade)
- 다국어 support (en + ko)? (기본: ko 우선, en stub)
- Refund policy? (기본: cancelled state + admin mediation, 정식 환불 프로세스 Phase 2.8)

---

**END OF REFERENCES v1**
