# Phase 2.5 follow-ups (post-G1)

Items surfaced during G1 pre-apply review that must be resolved before specific downstream gates. Each entry names the gate that will enforce it.

---

## FU-1 — 정보통신망법 §50 compliance (G7 dispatch layer)

**Trigger**: G7 entry, 또는 Phase 2.5 closeout 직전
**Risk**: 미준수 시 3천만원 이하 과태료 + 방통위 제재 + 평판 리스크

**Action required**:
1. `notification_preferences` ADD COLUMN `challenge_marketing_enabled` boolean
   DEFAULT FALSE (별도 follow-up migration — NOT in G1, NOT in G7 main migration).
2. 회원가입 폼에 별도 체크박스 + 명시적 문구 (G2 auth flow update).
3. 동의 로그 테이블 (`consent_log`: `user_id` / `kind` / `ip` / `user_agent` / `consented_at`) — new migration.
4. 메일 footer 수신거부 링크 (이미 Phase 1.8 `notification_unsubscribe_tokens` 패턴 재사용 가능) + 야간 발송 가드 (21:00-08:00 KST) 추가 at Edge Function `notify-dispatch`.
5. G7 dispatch logic는 다음 분기:
   - **거래 관계 정보** (joined-challenge progress, submission confirmed, 24h-before reminder for participants, announcement for entrants): `challenge_updates_enabled` 만 확인. Opt-out-able but default-on. No night guard.
   - **마케팅 정보** (new challenge announcements to non-entrants, promotional digests): `challenge_marketing_enabled` 확인 + 야간 가드 + 메일 제목 앞에 "[광고]" prefix (정보통신망법 시행령 §61 §2항).

**Owner**: yagi + web Claude review
**Status**: deferred to G7 entry

---

## FU-2 — `challenge_updates_enabled` semantic clarification (SPEC addendum — immediate)

**Trigger**: G1 apply 후 즉시
**Risk**: SPEC v2 §253-254 prose가 column의 scope를 명시 안 해서 G7에서 잘못 해석할 여지 있음.

**Action required**: SPEC v2 §253-254 acceptance prose에 다음 한 줄 추가 — "This column governs transactional notifications only (joined-challenge progress). Marketing notifications (new challenge announcements) require a separate opt-in flag to be added at G7 per Korean 정보통신망법 §50 compliance. See FOLLOWUPS.md FU-1."

**Owner**: Builder (this session, post-apply)
**Status**: applied inline after G1 apply

---

## FU-3 — R2 bucket provisioning (G4 entry)

**Trigger**: G4 entry (submission flow build)
**Risk**: G4 block on Option B fallback (Supabase Storage `challenge-submissions` bucket, 50MB cap) if R2 bucket not ready.

**Action required** (external to Builder):
1. Cloudflare R2: create bucket `yagi-challenge-submissions`.
2. CORS config: scope to `yagiworkshop.xyz` + `localhost:3001` (G2 signup) + `localhost:3003` (dev server). Allow `PUT`/`HEAD` from origin; `Content-Type` header; ≤500MB body.
3. Credentials: add `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` env vars to `.env.local` + Vercel + Supabase Edge Function secrets (if signed-URL generation moves server-side).
4. If not ready by G4 start: Builder takes Option B fallback — Supabase Storage bucket `challenge-submissions` with signed-URL upload pattern (copy from Phase 1.7 `team-channel-attachments`). SPEC video size cap temporarily reduced 500MB → 50MB (Free plan). Upgrade path in Phase 2.6.

**Owner**: yagi (external)
**Status**: open; Builder reports status at G4 entry

---

## FU-4 — Admin bootstrap (G8 closeout verification)

**Trigger**: G8 closeout — first admin verification
**Risk**: Phase 2.5 `/admin/challenges/*` routes unusable without a live `user_roles` row with `role='yagi_admin'`.

**Action required**:
1. G1 migration does NOT seed admin (avoids env-var coupling).
2. Manual SQL in Supabase SQL Editor post-G1:
   ```sql
   INSERT INTO public.user_roles (user_id, role, workspace_id)
   VALUES ('<yagi's auth.users.id>', 'yagi_admin', NULL)
   ON CONFLICT DO NOTHING;
   ```
3. Verify via `/admin/challenges` route render at G5 end.

**Owner**: yagi (manual)
**Status**: open; Builder reminds at G5/G8

---

## FU-5 — Reserved handles list ownership (G2 entry)

**Trigger**: G2 (auth flow + role selection) start
**Risk**: Handle collision with route segments breaks navigation.

**Action required**: Create `src/lib/handles/reserved.ts` per SPEC v2 §6 Q4 proposal:

```ts
export const RESERVED_HANDLES = [
  "admin", "yagi", "yagiworkshop", "challenges", "challenge", "submit",
  "gallery", "settings", "profile", "u", "auth", "login", "signup",
  "logout", "showcase", "about", "contact", "privacy", "terms", "help",
  "support", "team", "blog", "app", "www", "api", "onboarding",
  "dashboard", "s", "ko", "en", "ko-kr", "en-us",
] as const;
```

**Owner**: Builder (G2)
**Status**: scheduled for G2

---

## FU-6 — `challenges-closing-reminder` pg_cron job (G7 entry)

**Trigger**: G7 (notifications + realtime glue) entry
**Risk**: SPEC §2 success criterion #9(b) (24h-before reminder) not firing.

**Action required**: Add pg_cron job via new migration (NOT in G1):

```sql
SELECT cron.schedule(
  'challenges-closing-reminder',
  '*/15 * * * *',
  $$
  WITH expiring AS (
    SELECT id FROM public.challenges
    WHERE state = 'open'
      AND close_at BETWEEN now() + interval '23h 45min'
                       AND now() + interval '24h 15min'
      AND reminder_sent_at IS NULL
    FOR UPDATE SKIP LOCKED
  )
  -- emit notification_events rows + stamp reminder_sent_at
  -- (actual emit logic wired at G7 in a helper function or inline)
  UPDATE public.challenges c
     SET reminder_sent_at = now()
    FROM expiring e
   WHERE c.id = e.id;
  $$
);
```

Plus the emit helper + per-submitter/observer fan-out logic. See SPEC v2 §3 G7 Task 3.

**Owner**: Builder (G7)
**Status**: scheduled for G7

---

## FU-8 — RLS policy `auth.uid()` → `(select auth.uid())` optimization (Phase 2.6)

**Trigger**: Phase 2.6 optimization sprint, or when any challenge table crosses ~10k rows
**Risk**: `auth_rls_initplan` advisor flagged 14 WARNs across Phase 2.5 RLS policies. Each row-eval of `auth.uid()` / `is_yagi_admin(auth.uid())` wastes a function call. At scale (>10k rows scanned per query), the per-row re-evaluation materially degrades p50/p95 latency.

**Action required**: Rewrite affected policies so that `auth.uid()` calls are wrapped in `(select auth.uid())`, which Postgres hoists to an InitPlan (evaluated once per query, not per row). Tables touched:
- creators (`creators_insert_self`, `creators_update_self`)
- studios (`studios_insert_self`, `studios_update_self`)
- challenges (`challenges_select_public`, `challenges_admin_insert`, `challenges_admin_update`, `challenges_admin_delete`)
- challenge_submissions (`challenge_submissions_insert_self`, `challenge_submissions_update_self`, `challenge_submissions_admin_update`)
- challenge_votes (`challenge_votes_insert_self`)
- challenge_judgments (`challenge_judgments_admin_all`)
- showcase_challenge_winners (`showcase_challenge_winners_admin_write`)

Same transform applied consistently via migration. Zero behavior change. See https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select.

**Owner**: Builder (Phase 2.6)
**Status**: deferred — non-blocking at Phase 2.5 launch (MVP row counts)

---

## FU-9 — Covering indexes for unindexed FKs (Phase 2.6)

**Trigger**: Phase 2.6 optimization sprint, or when join-heavy admin queries surface in logs
**Risk**: `unindexed_foreign_keys` advisor flagged 7 FKs on Phase 2.5 tables without covering indexes. JOINs from the referenced table direction will seqscan the child table.

**Action required**: Evaluate each FK against actual query patterns before adding indexes (Supabase's advice is "add index if FK gets JOINed heavily"). Candidates:
- `challenge_judgments (admin_id)` — only used in admin panel FK view
- `challenge_judgments (challenge_id)` — admin panel analytics
- `challenge_submissions (submitter_id)` — NEEDED if "my submissions" profile view is row-heavy
- `challenge_votes (voter_id)` — "my votes" lookup
- `challenges (created_by)` — rare (admin audit only)
- `showcase_challenge_winners (announced_by)` — rare
- `showcase_challenge_winners (showcase_id)` — JOIN from showcase → pinned winners; likely needed

Not all need indexes — decide based on G5/G6 query shape once landed.

**Owner**: Builder (Phase 2.6)
**Status**: deferred — non-blocking at MVP row counts

---

## FU-10 — Active-persona VIEWs (G3 entry, optional)

**Trigger**: G3 public challenge surfaces, when the first creators/studios read query is authored
**Risk**: Post-hardening, stale creators/studios rows survive role flips by design (see migration 20260423030001 §3c). G3/G6 read queries must filter by current `profiles.role` — forgetting the join surfaces retired personas as active creators.

**Action required**: Create two VIEWs as canonical read paths:

```sql
CREATE VIEW public.v_active_creators AS
SELECT c.* FROM public.creators c
JOIN public.profiles p ON p.id = c.id AND p.role = 'creator';

CREATE VIEW public.v_active_studios AS
SELECT s.* FROM public.studios s
JOIN public.profiles p ON p.id = s.id AND p.role = 'studio';
```

Grant SELECT to `anon` + `authenticated`. G3/G6 Server Actions + RSC queries query the VIEW, not the raw table. Raw table access remains for admin tooling + historical audit.

**Owner**: Builder (G3 entry, if read-query patterns materialize)
**Status**: deferred — optional convenience; correctness achievable without VIEW by hand-writing the JOIN at each call site

---

## FU-12 — service-role backfill path (future historical import)

**Trigger**: Any future migration that needs to backfill historical `challenge_submissions` rows with a non-`now()` `created_at` (e.g., M&A imports, data recovery, cross-env replication).
**Risk**: Phase 2.5 G1 hardening v2 §2 moved `created_at` immutability enforcement to the head of the `tg_challenge_submissions_guard_self_mutation` trigger, applying to ALL roles. Triggers are NOT RLS-bypassable, so service_role INSERTs with arbitrary `created_at` will be silently swallowed by the trigger on any subsequent UPDATE, and backfills that rely on UPDATE paths will be blocked.

**Action required at backfill design time**: Use the standard PostgreSQL pattern to scope trigger suspension to the migration:

```sql
-- Option A (surgical, per-table)
ALTER TABLE public.challenge_submissions DISABLE TRIGGER tg_challenge_submissions_guard_self_mutation;
-- ... backfill UPDATE statements ...
ALTER TABLE public.challenge_submissions ENABLE TRIGGER tg_challenge_submissions_guard_self_mutation;

-- Option B (session-scoped, bypass all user triggers)
SET session_replication_role = replica;
-- ... backfill statements ...
SET session_replication_role = origin;
```

Document the exact pattern + review scope at backfill design time. INSERT paths with explicit `created_at` at row-creation time are unaffected — the trigger only fires on UPDATE.

**Owner**: deferred (no backfill scenario in Phase 2.5 launch scope)
**Status**: open

---

## FU-7 — Cron job seed migration (Phase 2.2 or 2.6)

**Trigger**: First Phase 2.x infra-consolidation sprint
**Risk**: `notify-dispatch` pg_cron job (Phase 1.8) lives only in live DB. `supabase db reset` on clean-clone won't schedule it — production email pipeline silent on fresh env.

**Action required**: Migration that seeds the `notify-dispatch` cron job idempotently (ALTER/DROP/CREATE `cron.schedule` as needed). Pattern reusable for FU-6 challenges-closing-reminder.

**Owner**: deferred (Phase 2.2 BACKLOG §Infra seed migrations — already logged)

---

## FU-11 — `is_handle_available` UNION ALL short-circuit optimization

**Trigger**: Phase 2.6 (performance sweep)
**Risk**: 미미. 현재 부하 zero, citext index 조회 O(log n) × 2.
**Action**: UNION ALL → OR EXISTS 구조로 재작성하여 planner short-circuit 활성화.

```sql
RETURN NOT (
  EXISTS (SELECT 1 FROM public.profiles WHERE handle = candidate)
  OR EXISTS (SELECT 1 FROM public.handle_history WHERE old_handle = candidate)
);
```

**Status**: deferred to Phase 2.6
**Registered**: G2 hardening v1 authoring (2026-04-23)

---

## FU-13 — FORCE ROW LEVEL SECURITY system-wide rollout

**Trigger**: Phase 2.6 (security hardening batch, alongside FU-8 `auth.uid()` optimization)
**Risk**: 현재 MED — table owner (postgres / authenticator) RLS 우회 가능. 공격 경로 구체성 낮음 (Supabase managed role 누수 드묾) 하지만 defense in depth.
**Action**: 전 Phase 2.5 테이블에 FORCE RLS 적용:
- `profiles` (existing — Phase 1.1 의존 변경 주의)
- `creators`, `studios`
- `challenges`, `challenge_submissions`, `challenge_votes`, `challenge_judgments`
- `showcase_challenge_winners`
- `handle_history` (G2 hardening v1 surfaced this — deferred to system-wide rollout)

**Caveats**:
- FORCE RLS은 table owner도 RLS 적용. Supabase migrations는 role=postgres 실행이므로 DDL 시점엔 bypass 가능 (RLS check 안 걸림). `SECURITY DEFINER` 함수만 주의.
- Service role key 사용 코드 경로 전수 검토 필요 (FORCE 적용 후 service_role도 RLS 통과 필요).

**Status**: deferred to Phase 2.6
**Registered**: G2 hardening v1 Codex K-05 M2 finding (2026-04-23)
**Status**: open


---

## FU-SCOPES-1 — G0 pre-work: useUserScopes hook + scope resolver (⚠️ BLOCKER for G6 entry)

**Trigger:** Phase 2.6 G0 pre-work. See `.yagi-autobuild/phase-2-6/SPEC.md` §8 fragility guard.

**Status:** ⚠️ BLOCKER — G6 entry verification required.

**Problem:** Phase 2.6 G2 (scope selector) and Phase 2.5 G6 (`/u/[handle]` edit affordance) both need to consume role-gated scope information via a shared hook. If Phase 2.5 G6 ships first with ad-hoc role checks, Phase 2.6 requires retrofitting (3-4h cost).

**Solution:** Land `useUserScopes` hook + `getUserScopes` server resolver BEFORE G6 first commit. Full spec inline in `.yagi-autobuild/phase-2-5/G6-ENTRY-DECISION-PACKAGE.md` §0.

**Action at G6 entry (Builder):**

```bash
# Verification step (run FIRST, before any G6 work)
test -f src/lib/app/scopes.ts && \
  grep -q "export function getUserScopes" src/lib/app/scopes.ts && \
  test -f src/lib/app/use-user-scopes.ts && \
  grep -q "export function useUserScopes" src/lib/app/use-user-scopes.ts
```

- **EXIT 0** → skip to G6 main tasks.
- **EXIT non-zero** → execute G0 spec from G6-ENTRY-DECISION-PACKAGE.md §0 FIRST, then G6.

**Telegram on G0 completion:**
```
✅ Phase 2.5 G0 (FU-SCOPES-1) SHIPPED — useUserScopes hook + scope resolver landed.
Proceeding to G6 main tasks.
```

**Files created by G0:**
- `src/lib/app/scopes.ts`
- `src/lib/app/use-user-scopes.ts`
- `src/app/[locale]/app/layout.tsx` (wrapped with `<UserScopesProvider>`)

**Duration:** 1-1.5h (mini-gate inside Phase 2.5 G5↔G6 window).

**Cross-refs:**
- Phase 2.6 SPEC.md §8 fragility guard (3-layer)
- Phase 2.5 G6-ENTRY-DECISION-PACKAGE.md §0 inline spec
- Phase 2.6 Success Criterion #15 (`useUserScopes` shared across 2.5 G6 + 2.6 G2)

**Registered:** 2026-04-24 (Phase 2.6 v3.1 SPEC authoring)
**Status:** open (blocker until G6 entry)

---

## FU-19 — profiles.external_links column + UI

**Trigger**: Phase 2.6 (bundled with sidebar IA refactor if schema work needed anyway).
**Risk**: LOW — cosmetic/profile-richness. No user-blocking impact.
**Background**: G6 DP §F specified `external_links jsonb` on profiles. Column was missing at G6 entry. Per ULTRA-CHAIN D rule (only G7 pg_cron migration allowed in overnight autopilot), migration was deferred instead of landing mid-chain.
**Action**: 
1. Migration: `ALTER TABLE public.profiles ADD COLUMN external_links jsonb DEFAULT '[]'::jsonb;` with CHECK `(jsonb_typeof(external_links) = 'array' AND jsonb_array_length(external_links) <= 3)`.
2. Regenerate `src/lib/supabase/database.types.ts`.
3. UI: extend `settings/profile-form.tsx` with external-links dynamic array (RHF useFieldArray, max 3 rows, label max 30, url Zod .url()).
4. Server: extend `updateProfileExtendedAction` to accept/validate/UPDATE external_links.
5. Display: extend `src/app/u/[handle]/page.tsx` Meta section to render external_links below Instagram.
**Owner**: Phase 2.6 author.
**Status**: open
**Registered**: G6 Group A closeout (2026-04-24, overnight autopilot)

---

## FU-22 — Public gallery vote counts via get_submission_vote_counts RPC

**Trigger**: Phase 2.6 polish
**Risk**: LOW — UX gap, no security impact
**Background**: Post-G8 hardening, challenge_votes direct read is now owner-scoped + admin. `getChallengeGallery(challengeId)` in `src/lib/challenges/queries.ts` does not populate `submission.vote_count`. `submission-card.tsx` falls back to 0 when field is absent. Public gallery displays "응원 0" for all submissions as a result. Announce page (admin) already calls `get_submission_vote_counts` RPC correctly.
**Action**:
1. In `src/lib/challenges/queries.ts` `getChallengeGallery()`: after fetching submissions + winners, call `supabase.rpc("get_submission_vote_counts", { p_challenge_id: challengeId })` and merge the counts onto each submission by `submission_id`.
2. Verify type from regenerated `database.types.ts`; cast if RPC isn't in types yet.
3. Smoke: anon viewer sees real counts on /challenges/<slug>/gallery.
**Owner**: Phase 2.6 author.
**Status**: open
**Registered**: G8 hardening sub-chain closeout (2026-04-24)
